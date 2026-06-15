import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AddJobLinesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  jobIds!: string[];
}
