import { createFileRoute, Link } from '@tanstack/react-router';
import { css } from 'styled-system/css';
import { buttonVariants } from '#/components/ui/Button';
import { Card, cardBody } from '#/components/ui/Card';

export const Route = createFileRoute('/')({ component: Home });

const pageClass = css({
	p: '6',
	maxWidth: '900px',
});

const heroClass = css({
	mb: '8',
});

const eyebrowClass = css({
	fontSize: 'sm',
	fontWeight: 'medium',
	color: 'accent',
	mb: '3',
	display: 'block',
	letterSpacing: '0.06em',
	textTransform: 'uppercase',
});

const titleClass = css({
	fontSize: '3xl',
	fontWeight: 'normal',
	color: 'foreground',
	mb: '3',
	lineHeight: '1.15',
	letterSpacing: '-0.01em',
});

const subtitleClass = css({
	fontSize: 'md',
	color: 'foregroundMuted',
	mb: '6',
	lineHeight: '1.6',
	maxWidth: '560px',
});

const ctaRowClass = css({
	display: 'flex',
	gap: '3',
	flexWrap: 'wrap',
});

const featureGridClass = css({
	display: 'grid',
	gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)' },
	gap: '3',
	mb: '6',
});

const featureTitleClass = css({
	fontSize: 'base',
	fontWeight: 'semibold',
	color: 'foreground',
	mb: '1',
});

const featureDescClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	lineHeight: '1.5',
	margin: '0',
});

const setupSectionClass = css({
	mb: '2',
});

const setupTitleClass = css({
	fontSize: 'sm',
	fontWeight: 'medium',
	color: 'foregroundMuted',
	mb: '3',
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
});

const codeClass = css({
	fontFamily: 'mono',
	fontSize: 'sm',
	bg: 'background',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	borderRadius: 'sm',
	px: '1',
	py: '0',
	color: 'accent',
});

const setupListClass = css({
	listStyle: 'none',
	padding: '0',
	margin: '0',
	display: 'flex',
	flexDir: 'column',
	gap: '2',
});

const setupItemClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	lineHeight: '1.6',
	display: 'flex',
	gap: '2',
	alignItems: 'flex-start',
});

const dotClass = css({
	w: '4',
	h: '4',
	borderRadius: 'full',
	bg: 'border',
	flexShrink: '0',
	mt: '1',
});

const FEATURES = [
	{
		title: 'Monorepo stack',
		desc: 'TanStack Start frontend, NestJS API, Prisma, and shared types in one workspace.',
	},
	{
		title: 'PriceCharting-aware',
		desc: 'Throttled outbound calls and a snapshot table aligned with their product payload.',
	},
	{
		title: 'Own your data',
		desc: 'PostgreSQL via Prisma — run locally with Docker Compose or host on Railway.',
	},
	{
		title: 'Copies & condition',
		desc: 'Classify sealed, CIB, loose, graded, and more with optional notes per copy.',
	},
];

function Home() {
	return (
		<div className={pageClass}>
			<div className={heroClass}>
				<span className={eyebrowClass}>Game inventory</span>
				<h1 className={titleClass}>
					Track what you own.
					<br />
					Know what it&apos;s worth.
				</h1>
				<p className={subtitleClass}>
					Log editions by UPC, attach copies with condition notes, and refresh
					fair market values from PriceCharting when your API token is set.
				</p>
				<div className={ctaRowClass}>
					<Link
						to="/inventory"
						className={buttonVariants({ variant: 'primary', size: 'md' })}
					>
						Open inventory
					</Link>
					<Link
						to="/inventory/add"
						className={buttonVariants({ variant: 'secondary', size: 'md' })}
					>
						Add a game
					</Link>
				</div>
			</div>

			<div className={featureGridClass}>
				{FEATURES.map((f) => (
					<Card key={f.title}>
						<div className={cardBody}>
							<p className={featureTitleClass}>{f.title}</p>
							<p className={featureDescClass}>{f.desc}</p>
						</div>
					</Card>
				))}
			</div>

			<Card>
				<div className={cardBody}>
					<p className={setupTitleClass}>Local development</p>
					<ul className={setupListClass}>
						{[
							<>
								Start Postgres, set{' '}
								<code className={codeClass}>DATABASE_URL</code>, then run{' '}
								<code className={codeClass}>pnpm db:migrate</code>.
							</>,
							<>
								Run <code className={codeClass}>pnpm dev:api</code> (port 4000)
								and <code className={codeClass}>pnpm dev</code> (port 3000).
								Point <code className={codeClass}>VITE_API_URL</code> at the
								API.
							</>,
							<>
								Optional: set{' '}
								<code className={codeClass}>PRICECHARTING_API_TOKEN</code> on
								the backend to enable market refresh.
							</>,
						].map((item, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static list
							<li key={i} className={setupItemClass}>
								<span className={dotClass} />
								<span className={setupSectionClass}>{item}</span>
							</li>
						))}
					</ul>
				</div>
			</Card>
		</div>
	);
}
