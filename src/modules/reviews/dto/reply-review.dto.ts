import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyReviewDto {
  @ApiProperty({
    description: 'Field owner reply to the review',
    example: 'Thank you for your feedback! We appreciate your visit.',
  })
  @IsString()
  @IsNotEmpty()
  ownerReply!: string;
}
