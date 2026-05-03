import { CopyClassification } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsNumberString,
	IsOptional,
	IsString,
	IsUUID,
	Matches,
	MaxLength,
	MinLength,
	ValidateIf,
} from "class-validator";

export class CreateEditionDto {
	/** When omitted or blank, PriceCharting match uses title + console only */
	@ValidateIf((_o, v) => v !== undefined && v !== null && String(v).trim() !== "")
	@IsString()
	@MinLength(8)
	@MaxLength(14)
	@Matches(/^\d+$/)
	upc?: string;

	@IsString()
	@MinLength(1)
	@MaxLength(500)
	title!: string;

	/** PriceCharting Console ID, e.g. G8, G12 */
	@IsString()
	@Matches(/^G\d+$/)
	priceChartingConsoleId!: string;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	publisher?: string;

	/** If true and PRICECHARTING_API_TOKEN is set, fetch FMV after create */
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	syncPriceCharting?: boolean;

	/** First owned copy created with this edition; defaults to CIB server-side */
	@IsOptional()
	@IsEnum(CopyClassification)
	initialCopyClassification?: CopyClassification;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	initialCopyNotes?: string | null;

	/** Optional shelf collections for the first `OwnedCopy` created with this edition. */
	@IsOptional()
	@IsArray()
	@IsUUID("4", { each: true })
	initialCopyCollectionIds?: string[];

	@IsOptional()
	@IsNumberString()
	initialPurchaseAmount?: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(3)
	initialPurchaseCurrency?: string | null;

	@IsOptional()
	@IsNumberString()
	initialOfferAmount?: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(3)
	initialOfferCurrency?: string | null;
}
