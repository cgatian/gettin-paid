import {
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from "class-validator";

export class PatchEditionDto {
	@IsOptional()
	@IsString()
	@MinLength(8)
	@MaxLength(14)
	@Matches(/^\d+$/)
	upc?: string;

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
