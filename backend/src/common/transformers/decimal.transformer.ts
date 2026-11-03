import { ValueTransformer } from 'typeorm';

export const DecimalTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};
