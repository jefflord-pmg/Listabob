import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { ListSummary } from '../../types';
import { useUpdateList } from '../../hooks/useLists';

interface ListCardProps {
  list: ListSummary;
}

export function ListCard({ list }: ListCardProps) {
  const updateList = useUpdateList();

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateList.mutate({ id: list.id, is_favorite: !list.is_favorite });
  };

  return (
    <Link
      to={`/list/${list.id}`}
      className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{list.icon || '📋'}</span>
            <h3 className="card-title text-base">{list.name}</h3>
          </div>
          <button
            onClick={toggleFavorite}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label={list.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {list.is_favorite ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </button>
        </div>
        {list.description && (
          <p className="text-sm text-base-content/70 line-clamp-2">{list.description}</p>
        )}
        <div className="text-xs text-base-content/50 mt-2">
          Updated {formatDistanceToNow(new Date(list.updated_at), { addSuffix: true })}
        </div>
      </div>
    </Link>
  );
}
