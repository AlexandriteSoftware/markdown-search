import
  {
    Logger,
    createLogger,
    transports,
    format
  } from 'winston';

export function loggers()
{
  return {
    getNullLogger,
    getDebugConsoleLogger: getDebugConsoleLogger
  };
}

export function getNullLogger(): Logger
{
  return createLogger({ silent: true });
}

export function getDebugConsoleLogger(): Logger
{
  return createLogger({
    level: 'debug',
    format: format.simple(),
    transports: [new transports.Console()]
  });
}