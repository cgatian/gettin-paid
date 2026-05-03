import { createFileRoute, Outlet } from '@tanstack/react-router';

/** Layout for `/collections/:collectionId` and nested routes (e.g. scoped game edition). */
export const Route = createFileRoute('/collections/$collectionId')({
	component: () => <Outlet />,
});
