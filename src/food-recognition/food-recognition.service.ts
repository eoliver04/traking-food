import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { normalizedImage } from 'src/image-processing/normalized-image';
import {
  FoodIdentification,
  IdentifiedFood,
} from './dto/food-identification.dto';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const MAX_GRAMS = 2000;

@Injectable()
export class FoodRecognitionService {
  private readonly logger = new Logger(FoodRecognitionService.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_API'),
    });
    this.model = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-3.5-flash-lite',
    );
  }

  async identifyFoods(imageBuffer: Buffer): Promise<FoodIdentification> {
    const imageBase64 = (await normalizedImage(imageBuffer)).toString('base64');

    const systemInstruction = `
      Eres un nutricionista experto y un sistema de visión artificial especializado en análisis de platos de comida.
      Tu tarea es identificar cada alimento visible en la imagen, estimar su peso en gramos y generar un término de búsqueda preciso en inglés ('usdaQuery') optimizado para la base de datos de la USDA.

      REGLAS ESTRICTAS PARA 'usdaQuery':
      1. **Método de cocción obligatorio:** Añade siempre el estado del alimento (ej. 'cooked', 'grilled', 'roasted').
      2. **Reglas para Salsas y Aderezos:** 
         - NUNCA uses la palabra 'creamy' sola en el 'usdaQuery', ya que la USDA la asocia con mantequillas de frutos secos.
         - Para salsas acompañantes (como salsas de carne, salsas blancas o salsas emulsificadas), usa términos como 'sauce, meat', 'cream sauce' o 'pan sauce'. Si es una salsa casera o específica, busca su equivalente genérico (ej. 'pepper sauce' o 'mushroom sauce').
      3. **Evitar derivados incorrectos:**
         - Para patatas, usa 'roasted potato' o 'baked potato' (NUNCA harinas o pan).
         - Para carnes, usa cortes específicos seguidos de 'cooked' o 'grilled' (ej. 'beef steak cooked').
         - Para bebidas, usa 'table red wine'.
      4. Devuelve la respuesta exclusivamente en formato JSON válido.
    `;

    const prompt = `
Analiza la imagen y devuelve los alimentos visibles con esta estructura exacta:
{
  "foods": [
    {
      "name": "Nombre del alimento en español",
      "usdaQuery": "término de búsqueda en inglés para USDA",
      "estimatedGrams": 0,
      "confidence": 0.0
    }
  ]
}

estimatedGrams debe ser un número positivo aproximado y confidence debe estar
entre 0 y 1. No incluyas platos, cubiertos, vasos, decoración ni calorías.
`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              // normalizedImage devuelve siempre JPEG, por eso el mimeType es fijo
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            foods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  usdaQuery: { type: 'string' },
                  estimatedGrams: { type: 'number' },
                  confidence: { type: 'number' },
                },
                required: ['name', 'usdaQuery', 'estimatedGrams', 'confidence'],
              },
            },
          },
          required: ['foods'],
        },
      },
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error('Gemini returned an empty response');
    }

    const identification = JSON.parse(responseText) as FoodIdentification;

    // Sanitizamos los valores que devuelve el modelo
    const foods = (identification.foods ?? [])
      .map((food: IdentifiedFood): IdentifiedFood => {
        return {
          name: food.name,
          usdaQuery: food.usdaQuery,
          estimatedGrams: clamp(food.estimatedGrams ?? 0, 0, MAX_GRAMS),
          confidence: clamp(food.confidence ?? 0, 0, 1),
        };
      })
      .filter(
        (food) => food.estimatedGrams > 0 && food.usdaQuery.trim() !== '',
      );

    this.logger.log(`Identified ${foods.length} food item(s) in image`);

    return { foods };
  }
}
