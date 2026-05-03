import { createFileRoute, redirect } from '@tanstack/react-router';

/** Old URL; library overview now lives on `/inventory` with the games list. */
export const Route = createFileRoute('/entire-collection')({
	beforeLoad: () => {
		throw redirect({ to: '/inventory' });
	},
});
