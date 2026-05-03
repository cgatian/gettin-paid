import { COLLECTION_BADGE_COLORS } from "@gettin-paid/shared";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class PatchCollectionDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(200)
	title?: string;

	@IsOptional()
	@IsString()
	@MaxLength(5000)
	description?: string | null;

	@IsOptional()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toUpperCase() : value,
	)
	@IsString()
	@IsIn([...COLLECTION_BADGE_COLORS], {
		message: `badgeColor must be one of: ${COLLECTION_BADGE_COLORS.join(", ")}`,
	})
	badgeColor?: string;
}
