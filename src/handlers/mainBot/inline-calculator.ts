import { InlineQueryHandler, TelegramBot, TelegramInlineQuery, TelegramInlineQueryResult } from '../types/telegram'

// Safe math expression evaluator
class SafeCalculator {
  private static operators = {
    '+': (a: number, b: number) => a + b,
    '-': (a: number, b: number) => a - b,
    '*': (a: number, b: number) => a * b,
    '/': (a: number, b: number) => a / b,
    '^': (a: number, b: number) => Math.pow(a, b),
    '%': (a: number, b: number) => a % b
  }

  private static precedence = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
    '^': 3
  }

  static evaluate(expression: string): number {
    const tokens = this.tokenize(expression)
    const postfix = this.toPostfix(tokens)
    return this.evaluatePostfix(postfix)
  }

  private static tokenize(expression: string): string[] {
    const tokens: string[] = []
    let current = ''
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i]
      
      if (char === ' ') continue
      
      if (this.isDigit(char) || char === '.') {
        current += char
      } else if (this.isOperator(char)) {
        if (current) {
          tokens.push(current)
          current = ''
        }
        tokens.push(char)
      } else if (char === '(' || char === ')') {
        if (current) {
          tokens.push(current)
          current = ''
        }
        tokens.push(char)
      }
    }
    
    if (current) {
      tokens.push(current)
    }
    
    return tokens
  }

  private static isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private static isOperator(char: string): boolean {
    return Object.keys(this.operators).includes(char)
  }

  private static toPostfix(tokens: string[]): string[] {
    const output: string[] = []
    const stack: string[] = []
    
    for (const token of tokens) {
      if (this.isDigit(token) || token.includes('.')) {
        output.push(token)
      } else if (token === '(') {
        stack.push(token)
      } else if (token === ')') {
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          output.push(stack.pop()!)
        }
        if (stack.length > 0 && stack[stack.length - 1] === '(') {
          stack.pop()
        }
      } else if (this.isOperator(token)) {
        while (
          stack.length > 0 &&
          stack[stack.length - 1] !== '(' &&
          this.precedence[stack[stack.length - 1] as keyof typeof this.precedence] >= this.precedence[token as keyof typeof this.precedence]
        ) {
          output.push(stack.pop()!)
        }
        stack.push(token)
      }
    }
    
    while (stack.length > 0) {
      output.push(stack.pop()!)
    }
    
    return output
  }

  private static evaluatePostfix(postfix: string[]): number {
    const stack: number[] = []
    
    for (const token of postfix) {
      if (this.isDigit(token) || token.includes('.')) {
        stack.push(parseFloat(token))
      } else if (this.isOperator(token)) {
        const b = stack.pop()!
        const a = stack.pop()!
        const result = this.operators[token as keyof typeof this.operators](a, b)
        stack.push(result)
      }
    }
    
    return stack[0]
  }
}

export const inlineCalculatorHandler: InlineQueryHandler = {
  name: 'inline-calculator',
  canHandle: (query: TelegramInlineQuery) => query.query.toLowerCase().startsWith('calc'),
  handle: async (query: TelegramInlineQuery, bot: TelegramBot) => {
    const expression = query.query.toLowerCase().replace('calc', '').trim()
    
    if (!expression) {
      const results: TelegramInlineQueryResult[] = [{
        type: 'article',
        id: 'help',
        title: 'Calculator Help',
        description: 'Type calc followed by a math expression (e.g., calc 2+2)',
        input_message_content: {
          message_text: '🧮 Calculator\n\nType calc followed by a math expression:\n• calc 2+2\n• calc 10*5\n• calc (3+4)*2\n• calc 2^3\n\nSupported operators: +, -, *, /, ^, %'
        }
      }]
      await bot.answerInlineQuery(query.id, results)
      return
    }
    
    try {
      const result = SafeCalculator.evaluate(expression)
      
      const results: TelegramInlineQueryResult[] = [{
        type: 'article',
        id: 'result',
        title: `${expression} = ${result}`,
        description: `Result: ${result}`,
        input_message_content: {
          message_text: `🧮 Calculator\n${expression} = ${result}`
        }
      }]
      
      await bot.answerInlineQuery(query.id, results)
    } catch (error) {
      const results: TelegramInlineQueryResult[] = [{
        type: 'article',
        id: 'error',
        title: 'Invalid Expression',
        description: 'Please check your math expression',
        input_message_content: {
          message_text: `❌ Calculator Error\nInvalid expression: ${expression}\n\nSupported: numbers, +, -, *, /, ^, %, (, )`
        }
      }]
      
      await bot.answerInlineQuery(query.id, results)
    }
  },
  requiredAuth: false
}

