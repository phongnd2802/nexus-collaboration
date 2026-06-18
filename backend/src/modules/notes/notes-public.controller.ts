import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { NotesService } from './notes.service';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('notes-public')
@Controller('notes-public')
export class NotesPublicController {
  constructor(private readonly notesService: NotesService) {}

  @Get('access-requests/:requestId/respond-email')
  @ApiOperation({ summary: 'Respond to note access request directly from email links' })
  @ApiParam({ name: 'requestId', description: 'The UUID of the note access request' })
  @ApiQuery({ name: 'action', enum: ['approve', 'deny'], description: 'The action to take' })
  async respondToAccessRequestFromEmail(
    @Param('requestId') requestId: string,
    @Query('action') action: 'approve' | 'deny',
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      // 1. Fetch the request to get details
      const request = await this.notesService.getAccessRequestByIdRaw(requestId);
      if (!request) {
        throw new NotFoundException('Access request not found');
      }

      const { workspace_id, note_id, owner_id, status } = request;

      // 2. If already processed, redirect to the note page with current status
      if (status !== 'pending') {
        const redirectUrl = `${frontendUrl}/workspaces/${workspace_id}/notes/${note_id}?access_request_status=${status}`;
        return res.redirect(redirectUrl);
      }

      // 3. Respond to the note access using owner ID stored in database
      await this.notesService.respondToNoteAccess(
        requestId,
        workspace_id,
        owner_id,
        { action },
      );

      // 4. Redirect with success status
      const redirectUrl = `${frontendUrl}/workspaces/${workspace_id}/notes/${note_id}?access_request_status=${action}d`;
      return res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('[NotesPublicController] Error handling email response:', error);
      const errorMessage = error?.message || 'Internal Server Error';
      // If we don't have request workspace_id, redirect to fallback
      const fallbackUrl = `${frontendUrl}/workspaces?access_request_status=error&message=${encodeURIComponent(errorMessage)}`;
      return res.redirect(fallbackUrl);
    }
  }
}
