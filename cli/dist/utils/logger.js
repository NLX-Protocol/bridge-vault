"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
exports.setLogLevel = setLogLevel;
exports.getLogLevel = getLogLevel;
const chalk_1 = __importDefault(require("chalk"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
let currentLogLevel = LogLevel.INFO;
function setLogLevel(level) {
    currentLogLevel = level;
}
function getLogLevel() {
    return currentLogLevel;
}
exports.logger = {
    debug: (message, ...args) => {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.log(chalk_1.default.gray(`[DEBUG] ${message}`), ...args);
        }
    },
    info: (message, ...args) => {
        if (currentLogLevel <= LogLevel.INFO) {
            console.log(chalk_1.default.blue(`[INFO] ${message}`), ...args);
        }
    },
    success: (message, ...args) => {
        if (currentLogLevel <= LogLevel.INFO) {
            console.log(chalk_1.default.green(`[SUCCESS] ${message}`), ...args);
        }
    },
    warn: (message, ...args) => {
        if (currentLogLevel <= LogLevel.WARN) {
            console.log(chalk_1.default.yellow(`[WARN] ${message}`), ...args);
        }
    },
    error: (message, ...args) => {
        if (currentLogLevel <= LogLevel.ERROR) {
            console.error(chalk_1.default.red(`[ERROR] ${message}`), ...args);
        }
    },
    table: (data) => {
        if (currentLogLevel <= LogLevel.INFO) {
            console.table(data);
        }
    }
};
