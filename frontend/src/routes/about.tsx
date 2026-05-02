import { createFileRoute } from "@tanstack/react-router";
import { css } from "styled-system/css";
import { Card, cardBody } from "#/components/ui/Card";

export const Route = createFileRoute("/about")({ component: About });

const pageClass = css({ p: "6", maxWidth: "700px" });

const pageTitleClass = css({
	fontSize: "2xl",
	fontWeight: "normal",
	color: "foreground",
	mb: "5",
	letterSpacing: "-0.01em",
});

const bodyTextClass = css({
	fontSize: "md",
	color: "foregroundMuted",
	lineHeight: "1.7",
	margin: "0",
});

function About() {
	return (
		<div className={pageClass}>
			<h1 className={pageTitleClass}>About</h1>
			<Card>
				<div className={cardBody}>
					<p className={bodyTextClass}>
						Gettin&apos; Paid is a personal game inventory tracker. Log editions
						by UPC, attach owned copies with condition notes, and refresh fair
						market values from PriceCharting. Built with TanStack Start, NestJS,
						Prisma, and PostgreSQL — self-hosted, own your data.
					</p>
				</div>
			</Card>
		</div>
	);
}
