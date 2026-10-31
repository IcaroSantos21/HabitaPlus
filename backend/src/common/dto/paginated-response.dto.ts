import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  pagina!: number;

  @ApiProperty({ example: 20 })
  limite!: number;

  @ApiProperty({ example: 134 })
  total!: number;

  @ApiProperty({ example: 7 })
  totalPaginas!: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export const paginate = <T>(
  data: T[],
  total: number,
  pagina: number,
  limite: number,
): PaginatedResponseDto<T> => {
  return {
    data,
    meta: {
      pagina: pagina,
      limite: limite,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  };
};
