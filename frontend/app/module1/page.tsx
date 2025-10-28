"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import {
  fetchFacultyQueue,
  fetchModule1Requirements,
  ModuleRequirement,
  FacultyRequestSummary,
  updateFacultyRequestStatus
} from '../../services/module1';
import { parseAcceptanceCriteria } from '../../lib/requirements';
import { publishToast } from '../../lib/toast';

interface FeatureGroup {
  name: string;
  stories: ModuleRequirement[];
}

const Module1Page = () => {
  const { user, initialized } = useRequireAuth({ redirectTo: '/login', silent: true });
  const [requirements, setRequirements] = useState<ModuleRequirement[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [queue, setQueue] = useState<FacultyRequestSummary[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueProcessing, setQueueProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!initialized || !user) return;
    let cancelled = false;

    const loadRequirements = async () => {
      setLoadingRequirements(true);
      try {
        const data = await fetchModule1Requirements();
        if (!cancelled) {
          setRequirements(data);
        }
      } catch (error) {
        console.error('Failed to load Module1 requirements', error);
        if (!cancelled) {
          publishToast('Unable to load Module 1 requirements. Try again shortly.', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoadingRequirements(false);
        }
      }
    };

    void loadRequirements();

    return () => {
      cancelled = true;
    };
  }, [initialized, user]);

  useEffect(() => {
    if (!initialized || user?.role !== 'admin') return;
    let cancelled = false;

    const loadQueue = async () => {
      setQueueLoading(true);
      try {
        const data = await fetchFacultyQueue('pending');
        if (!cancelled) {
          setQueue(data);
        }
      } catch (error) {
        console.error('Failed to load faculty queue', error);
        if (!cancelled) {
          publishToast('Unable to load faculty approval queue.', 'error');
        }
      } finally {
        if (!cancelled) {
          setQueueLoading(false);
        }
      }
    };

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [initialized, user]);

  const featureGroups = useMemo<FeatureGroup[]>(() => {
    const map = new Map<string, ModuleRequirement[]>();
    requirements.forEach((req) => {
      const name = req.feature ?? 'General';
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(req);
    });
    return Array.from(map.entries()).map(([name, stories]) => ({ name, stories }));
  }, [requirements]);

  const handleDecision = async (requestId: string, status: 'approved' | 'rejected') => {
    setQueueProcessing((current) => ({ ...current, [requestId]: true }));
    try {
      await updateFacultyRequestStatus(requestId, status);
      setQueue((current) => current.filter((item) => item._id !== requestId));
      publishToast(`Faculty request ${status}.`, status === 'approved' ? 'success' : 'info');
    } catch (error) {
      console.error('Failed to update faculty request', error);
      publishToast('Unable to update faculty request. Please retry.', 'error');
    } finally {
      setQueueProcessing((current) => ({ ...current, [requestId]: false }));
    }
  };

  if (!initialized) {
    return (
      <section className="mx-auto flex h-64 w-full max-w-4xl items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <p className="text-sm text-slate-500">Preparing Module 1 workspace…</p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Module 1 · Authentication & Onboarding</h1>
        <p className="mt-2 text-sm text-slate-600">
          Deliver secure onboarding, faculty approval workflows, and robust session management grounded in the Module 1
          user stories.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {loadingRequirements ? (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Loading acceptance criteria…</p>
          </div>
        ) : (
          featureGroups.map((group) => (
            <article key={group.name} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{group.name}</h2>
                {group.stories[0]?.userStory ? (
                  <p className="mt-1 text-sm text-slate-600">{group.stories[0]?.userStory}</p>
                ) : null}
              </div>
              <ul className="space-y-3">
                {group.stories.map((story) => {
                  const criteria = parseAcceptanceCriteria(story.acceptanceCriteria);
                  return (
                    <li key={story._id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">{story.userStory}</span>
                        {story.priority ? (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            Priority: {story.priority}
                          </span>
                        ) : null}
                      </div>
                      {criteria.length > 0 ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          {criteria.map((criterion, index) => (
                            <li key={`${story._id}-ac-${index}`}>{criterion}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))
        )}
      </section>

      {user.role === 'admin' ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Faculty approval queue</h2>
              <p className="text-sm text-slate-600">Review pending faculty registrations and keep access secure.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Pending: {queue.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {queueLoading ? <p className="text-sm text-slate-500">Loading requests…</p> : null}
            {!queueLoading && queue.length === 0 ? (
              <p className="text-sm text-slate-500">No pending requests. Great job staying on top of approvals!</p>
            ) : null}
            {queue.map((request) => (
              <article
                key={request._id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{request.user.name}</p>
                  <p>{request.user.email}</p>
                  <p>
                    {request.department} · {request.designation}
                  </p>
                  {request.expertise ? <p className="text-xs text-slate-500">Expertise: {request.expertise}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision(request._id, 'rejected')}
                    disabled={queueProcessing[request._id] === true}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(request._id, 'approved')}
                    disabled={queueProcessing[request._id] === true}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-300"
                  >
                    {queueProcessing[request._id] ? 'Processing…' : 'Approve'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default Module1Page;
