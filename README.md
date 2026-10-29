# Traking Food 🍽️

API en **NestJS** que analiza fotos de comida y calcula su valor nutricional
(calorías, proteína, carbohidratos y grasa) combinando **Gemini AI** (visión por
computadora) con la **base de datos USDA FoodData Central**.

## Cómo funciona

1. Se sube una imagen del plato vía `POST /food-analysis`.
2. La imagen se normaliza con `sharp` (rotación EXIF, máx. 1600 px, JPEG).
3. **Gemini** identifica cada alimento, estima los gramos y genera una query en
   inglés optimizada para la USDA.
4. Se consulta la **USDA FDC API** (primero Foundation/SR Legacy, con fallback
   de búsqueda amplia) para obtener los macros por 100 g.
5. Se escala el valor nutricional a los gramos estimados y se devuelven los
   totales del plato (con fallback Atwater 4-9-4 si la USDA no trae calorías).

## Endpoints

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/` | Health check |
| `POST` | `/food-analysis` | Analiza imagen de comida. Body: `multipart/form-data` con campo `image` (JPEG/PNG/WebP, máx. 5 MB) |
| `GET` | `/nutrition/search?foodName=...` | Busca datos nutricionales en la USDA por nombre (en inglés) |

Ejemplos con curl:

```bash
# Health check
curl http://localhost:3000/

# Analizar foto
curl -X POST http://localhost:3000/food-analysis -F "image=@plato.jpg"

# Buscar alimento en USDA
curl "http://localhost:3000/nutrition/search?foodName=chicken%20grilled"
```

Respuesta de `/food-analysis`:

```json
{
  "foods": [
    {
      "name": "Pechuga de pollo",
      "usdaMatch": "Chicken, broilers, breast, meat, cooked",
      "fdcId": 171505,
      "grams": 150,
      "calories": 247.5,
      "protein": 46.5,
      "carbohydrates": 0,
      "fat": 5.4
    }
  ],
  "totals": { "calories": 248, "protein": 47, "carbohydrates": 0, "fat": 5 }
}
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto (la app valida al arrancar que
existan las claves requeridas):

```env
GEMINI_API=tu_api_key_de_google
FOOD_API=tu_api_key_de_usda
GEMINI_MODEL=gemini-3.5-flash-lite   # opcional
PORT=3000                            # opcional
```

- Gemini API key: https://aistudio.google.com/
- USDA FDC API key: https://fdc.nal.usda.gov/api-key-signup.html

## Seguridad y límites

- Máximo **5 MB** por imagen y solo formatos `image/jpeg`, `image/png`, `image/webp`.
- Rate limiting global: **10 requests por minuto por IP**.
- Validación de variables de entorno al arranque.
- Filtro global de excepciones con respuestas de error consistentes.

## Proyecto

Requiere **Node.js 24.9+** (ver `.nvmrc`). NestJS 12 se distribuye solo como ESM y
Jest necesita `require(esm)` nativo, disponible a partir de esa versión; los
scripts de test ya pasan el flag `--experimental-vm-modules` que Jest requiere.

```bash
npm install        # instalar dependencias
npm run start:dev  # desarrollo (watch)
npm run build      # compilar
npm run start:prod # producción
npm run test       # tests unitarios
npm run lint       # eslint
```
