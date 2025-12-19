

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' and 'ref' field to a given type T. */
export type WithIdAndRef<T> = T & { id: string, ref: DocumentReference<T> };


/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithIdAndRef<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  setData: React.Dispatch<React.SetStateAction<WithIdAndRef<T>[] | null>>;
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error, and a manual setData function.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithIdAndRef<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    let isMounted = true; // Flag to track component mount status

    if (!memoizedTargetRefOrQuery) {
      if (isMounted) {
        setIsLoading(false);
        setData(null);
        setError(null);
      }
      return;
    }

    let path = 'unknown';
    try {
        path = memoizedTargetRefOrQuery.type === 'collection'
        ? (memoizedTargetRefOrQuery as CollectionReference).path
        : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()
    } catch (e) {
      // This can happen if the query is not fully formed yet.
    }

    if (!path || path === '/') {
        if (isMounted) {
            setIsLoading(false);
            setData(null);
            setError(null);
        }
        return;
    }

    if (isMounted) {
        setIsLoading(true);
        setError(null);
    }

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onSnapshot(
        memoizedTargetRefOrQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          if (!isMounted) return; // Don't update state if unmounted
          const results: ResultItemType[] = [];
          for (const doc of snapshot.docs) {
            results.push({ ...(doc.data() as T), id: doc.id, ref: doc.ref as DocumentReference<T> });
          }
          setData(results);
          setError(null);
          setIsLoading(false);
        },
        (err: FirestoreError) => {
          if (!isMounted) return; // Don't update state if unmounted
          console.error('Firestore listener error:', err);
          setError(err);
          setData(null);
          setIsLoading(false);

          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });
          errorEmitter.emit('permission-error', contextualError);
        }
      );
    } catch (err: any) {
        if (isMounted) {
            console.error('Error setting up Firestore listener:', err);
            setError(err);
            setLoading(false);
        }
    }


    return () => {
      isMounted = false; // Set flag to false on cleanup
      if (unsubscribe) {
        try {
            unsubscribe();
        } catch (err) {
            console.warn('Error unsubscribing from Firestore listener:', err);
        }
      }
    };
  }, [memoizedTargetRefOrQuery]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    console.warn('Warning: Firestore query/reference passed to useCollection was not memoized using useMemoFirebase. This may cause performance issues or infinite loops.');
  }

  return { data, isLoading, error, setData };
}
