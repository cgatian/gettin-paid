import { CopyClassification } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsArray,
	IsDateString,
	IsEnum,
	IsNumberString,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
} from "class-validator";

export class CreateCopyDto {
	@IsEnum(CopyClassification)
	copyClassification!: CopyClassification;

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
	@IsArray()
	@IsUUID("4", { each: true })
	collectionIds?: string[];
}
