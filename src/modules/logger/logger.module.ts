import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerService } from './logger.service';

/**
 * Logger Module
 * Provides structured logging with Winston
 * Supports configurable log levels from environment
 * Uses JSON format for machine parsing
 * Implements daily log rotation with 30-day retention
 * 
 * Requirements: 25.5, 25.6
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get('LOG_LEVEL', 'info');
        const nodeEnv = configService.get('NODE_ENV', 'development');

        // Define log format
        const logFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json(),
        );

        // Console format for development (more readable)
        const consoleFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            let log = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }
            return log;
          }),
        );

        // Configure transports based on environment
        const transports: winston.transport[] = [];

        // Console transport (always enabled)
        transports.push(
          new winston.transports.Console({
            format: nodeEnv === 'production' ? logFormat : consoleFormat,
          }),
        );

        // File transports for production with daily rotation
        if (nodeEnv === 'production') {
          // Combined log file with daily rotation
          transports.push(
            new DailyRotateFile({
              filename: 'logs/combined-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              format: logFormat,
              maxSize: '20m', // Rotate when file reaches 20MB
              maxFiles: '30d', // Keep logs for 30 days
              zippedArchive: true, // Compress old logs
            }),
          );

          // Error log file with daily rotation
          transports.push(
            new DailyRotateFile({
              filename: 'logs/error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              level: 'error',
              format: logFormat,
              maxSize: '20m', // Rotate when file reaches 20MB
              maxFiles: '30d', // Keep logs for 30 days
              zippedArchive: true, // Compress old logs
            }),
          );
        }

        return {
          level: logLevel,
          format: logFormat,
          transports,
          exitOnError: false,
        };
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService, WinstonModule],
})
export class LoggerModule {}
