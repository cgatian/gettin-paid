import { CopyClassification } from "@prisma/client";
import {
	IsDateString,
	IsEnum,
	IsNumberString,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";

export class PatchCopyDto {
	@IsOptional()
	@IsEnum(CopyClassification)
	copyClassification?: CopyClassification;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	classificationNotes?: string | null;

	@IsOptional()
	@IsNumberString()
	purchaseAmount?: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(3)
	purchaseCurrency?: string | null;

	@IsOptional()
	@IsDateString()
	purchaseDate?: string | null;

	@IsOptional()
	@IsNumberString()
	offerAmount?: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(3)
	offerCurrency?: string | null;

	@IsOptional()
	@IsNumberString()
	soldAmount?: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(3)
	soldCurrency?: string | null;

	@IsOptional()
	@IsDateString()
	soldAt?: string | null;
}
