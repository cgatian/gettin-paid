import {
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
	ValidateIf,
} from "class-validator";

export class PatchEditionDto {
	/** Omit, or send null / empty string to clear */
	@ValidateIf((_o, v) => v !== undefined && v !== null && String(v).trim() !== "")
	@IsString()
	@MinLength(8)
	@MaxLength(14)
	@Matches(/^\d+$/)
	upc?: string | null;

	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(500)
	title?: string;

	@IsOptional()
	@IsString()
	@Matches(/^G\d+$/)
	priceChartingConsoleId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	publisher?: string | null;
}
