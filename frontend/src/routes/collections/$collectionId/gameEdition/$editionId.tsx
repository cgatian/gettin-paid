import { createFileRoute } from '@tanstack/react-router';
import { EditionDetail } from '#/routes/inventory/$editionId';

export const Route = createFileRoute(
	'/collections/$collectionId/gameEdition/$editionId',
)({
	component: CollectionScopedEditionPage,
});

function CollectionScopedEditionPage() {
	const { collectionId, editionId } = Route.useParams();
	return (
		<EditionDetail editionId={editionId} collectionScopeId={collectionId} />
	);
}
