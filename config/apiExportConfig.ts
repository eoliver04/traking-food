import * as dotenv from 'dotenv';
dotenv.config();

export const apiKey = process.env.GEMINI_API;
export const foodApiKey = process.env.FOOD_API;