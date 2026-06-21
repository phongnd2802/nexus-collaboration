import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { BarChart2, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Poll, PollOption } from '@/lib/api/chat-api';
import { useVotePoll, useClosePoll } from '@/lib/api/chat-api';
import { useParams } from 'react-router-dom';

interface PollMessageProps {
  poll: Poll;
  messageId: string;
  currentUserId: string;
  userVotedOptionIds?: string[] | null;
}

export function PollMessage({
  poll,
  messageId,
  currentUserId,
  userVotedOptionIds: initialUserVotedOptionIds,
}: PollMessageProps) {
  const intl = useIntl();
  const { workspaceId } = useParams();
  const [userVotedOptionIds, setUserVotedOptionIds] = useState<string[]>(
    initialUserVotedOptionIds || []
  );
  const [localPoll, setLocalPoll] = useState<Poll>(poll);
  // selectedOptions tracks what the user has clicked but not yet submitted
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const voteMutation = useVotePoll();
  const closeMutation = useClosePoll();

  useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  useEffect(() => {
    if (initialUserVotedOptionIds) {
      setUserVotedOptionIds(initialUserVotedOptionIds);
    }
  }, [initialUserVotedOptionIds]);

  const isCreator = currentUserId === localPoll.createdBy;
  const hasVoted = userVotedOptionIds.length > 0;
  const canVote = localPoll.isOpen;
  const canViewResults =
    hasVoted || localPoll.showResultsBeforeVoting || !localPoll.isOpen;
  const isMultiple = !!localPoll.allowMultipleChoice;

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) => {
      if (isMultiple) {
        // Checkbox: toggle freely
        return prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId];
      } else {
        // Radio: toggle (deselect if same, replace otherwise)
        return prev.includes(optionId) ? [] : [optionId];
      }
    });
  };

  // Show the Vote/Change Vote button when selection differs from current votes
  const hasNewSelection =
    selectedOptions.length > 0 &&
    (selectedOptions.length !== userVotedOptionIds.length ||
      !selectedOptions.every((id) => userVotedOptionIds.includes(id)));

  const handleVote = async () => {
    if (!workspaceId || !canVote || selectedOptions.length === 0) return;

    try {
      const result = await voteMutation.mutateAsync({
        workspaceId,
        messageId,
        pollId: localPoll.id,
        optionIds: selectedOptions,
      });

      setUserVotedOptionIds(result.data.userVotedOptionIds);
      setLocalPoll(result.data.poll);
      setSelectedOptions([]);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleClosePoll = async () => {
    if (!workspaceId || !isCreator) return;

    try {
      const result = await closeMutation.mutateAsync({
        workspaceId,
        messageId,
        pollId: localPoll.id,
      });

      setLocalPoll(result.data.poll);
    } catch (error) {
      console.error('Failed to close poll:', error);
    }
  };

  const getVotePercentage = (option: PollOption): number => {
    if (localPoll.totalVotes === 0) return 0;
    return Math.round((option.voteCount / localPoll.totalVotes) * 100);
  };

  return (
    <div className="bg-muted/30 rounded-lg border p-4 max-w-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm">
          {intl.formatMessage({
            id: 'modules.chat.poll.title',
            defaultMessage: 'Poll',
          })}
        </span>
        {isMultiple && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {intl.formatMessage({
              id: 'modules.chat.poll.multipleChoice',
              defaultMessage: 'Multiple choice',
            })}
          </span>
        )}
        {!localPoll.isOpen && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {intl.formatMessage({
              id: 'modules.chat.poll.closed',
              defaultMessage: 'Closed',
            })}
          </span>
        )}
      </div>

      {/* Question */}
      <h4 className="font-semibold text-base mb-3">{localPoll.question}</h4>

      {/* Options */}
      <div className="space-y-2">
        {localPoll.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const isVoted = userVotedOptionIds.includes(option.id);
          const percentage = getVotePercentage(option);

          return (
            <div key={option.id} className="relative">
              {canVote ? (
                // Voting mode — clickable options
                <button
                  onClick={() => toggleOption(option.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-md border transition-colors relative overflow-hidden',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                      : isVoted
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  {canViewResults && (
                    <div
                      className="absolute inset-0 bg-muted/40 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Square for multiple choice, circle for single choice */}
                      <div
                        className={cn(
                          'w-4 h-4 border-2 flex items-center justify-center shrink-0',
                          isMultiple ? 'rounded' : 'rounded-full',
                          isSelected || isVoted
                            ? 'border-primary'
                            : 'border-muted-foreground'
                        )}
                      >
                        {isSelected && (
                          isMultiple
                            ? <Check className="h-2.5 w-2.5 text-primary" />
                            : <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        {!isSelected && isVoted && (
                          <Check className="h-2.5 w-2.5 text-primary" />
                        )}
                      </div>
                      <span className="text-sm">{option.text}</span>
                    </div>
                    {canViewResults && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {percentage}% ({option.voteCount})
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                // Results mode — static display
                <div
                  className={cn(
                    'relative overflow-hidden rounded-md border p-3',
                    isVoted ? 'border-primary' : 'border-border'
                  )}
                >
                  {canViewResults && (
                    <div
                      className={cn(
                        'absolute inset-0 transition-all',
                        isVoted ? 'bg-primary/20' : 'bg-muted'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isVoted && <Check className="h-4 w-4 text-primary shrink-0" />}
                      <span className="text-sm">{option.text}</span>
                    </div>
                    {canViewResults ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {percentage}% ({option.voteCount})
                      </span>
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vote / Change Vote button */}
      {canVote && hasNewSelection && (
        <Button
          onClick={handleVote}
          disabled={voteMutation.isPending}
          className="w-full mt-3"
          size="sm"
        >
          {voteMutation.isPending
            ? intl.formatMessage({
                id: 'modules.chat.poll.voting',
                defaultMessage: 'Voting...',
              })
            : hasVoted
              ? intl.formatMessage({
                  id: 'modules.chat.poll.changeVote',
                  defaultMessage: 'Change Vote',
                })
              : intl.formatMessage({
                  id: 'modules.chat.poll.vote',
                  defaultMessage: 'Vote',
                })}
        </Button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-muted-foreground">
          {intl.formatMessage(
            {
              id: 'modules.chat.poll.totalVotes',
              defaultMessage: '{count} {count, plural, one {vote} other {votes}}',
            },
            { count: localPoll.totalVotes }
          )}
        </span>

        {isCreator && localPoll.isOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClosePoll}
            disabled={closeMutation.isPending}
            className="text-xs h-7"
          >
            {closeMutation.isPending
              ? intl.formatMessage({
                  id: 'modules.chat.poll.closing',
                  defaultMessage: 'Closing...',
                })
              : intl.formatMessage({
                  id: 'modules.chat.poll.closePoll',
                  defaultMessage: 'Close Poll',
                })}
          </Button>
        )}
      </div>

      {!hasVoted && !localPoll.isOpen && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {intl.formatMessage({
            id: 'modules.chat.poll.closedNoVote',
            defaultMessage: 'This poll is closed. You did not vote.',
          })}
        </p>
      )}
    </div>
  );
}
