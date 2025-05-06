import axios from 'axios';
import { ENV } from '../config/env';

export interface LLMResponse {
  explanation: string;
  examples: string[];
  relatedWords: string[];
  mnemonics?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class LLMService {
  private static instance: LLMService;
  private readonly API_URL = 'https://api.openai.com/v1/chat/completions';

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      const apiKey = ENV.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await axios.post<OpenAIResponse>(
        this.API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful language learning assistant that provides clear, concise, and accurate information about English words and phrases.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling LLM:', error);
      throw new Error('Failed to get LLM response');
    }
  }

  public async getEnhancedExplanation(word: string, context?: string): Promise<LLMResponse> {
    const prompt = `Please provide the following information about the word "${word}"${context ? ` in the context of ${context}` : ''}:
    1. A clear and simple explanation
    2. Three example sentences showing different uses
    3. Three related words or phrases
    4. A memorable mnemonic device to help remember the word

    Format the response as JSON with the following structure:
    {
      "explanation": "string",
      "examples": ["string", "string", "string"],
      "relatedWords": ["string", "string", "string"],
      "mnemonics": "string"
    }`;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response) as LLMResponse;
    } catch (error) {
      console.error('Error getting enhanced explanation:', error);
      throw new Error('Failed to generate enhanced explanation');
    }
  }
} 