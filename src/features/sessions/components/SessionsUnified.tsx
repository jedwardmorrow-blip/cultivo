import { BuckingSessionsRefactored } from './BuckingSessionsRefactored';
import { TrimSessionsRefactored } from './TrimSessionsRefactored';
import { PackagingSessionsRefactored } from './PackagingSessionsRefactored';

export function SessionsUnified() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">All Sessions</h1>
        <p className="text-cult-silver mt-1">Overview of all active and completed production sessions</p>
      </div>
      <BuckingSessionsRefactored />
      <TrimSessionsRefactored />
      <PackagingSessionsRefactored />
    </div>
  );
}
