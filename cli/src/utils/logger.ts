import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

let currentLogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

export const logger = {
  debug: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  },
  
  success: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  },
  
  error: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  },
  
  table: (data: any[]): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.table(data);
    }
  }
};