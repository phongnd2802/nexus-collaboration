import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { NotesService } from './notes.service';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('notes-public')
@Controller('notes-public')
export class NotesPublicController {
  constructor(private readonly notesService: NotesService) {}

  @Get('permission-change/:noteId/respond-email')
  @ApiOperation({ summary: 'Owner responds to permission change request from email link' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  @ApiQuery({ name: 'requesterId', description: 'Requester user ID' })
  @ApiQuery({ name: 'action', enum: ['approve', 'deny'] })
  async respondToPermissionChangeFromEmail(
    @Param('noteId') noteId: string,
    @Query('requesterId') requesterId: string,
    @Query('action') action: 'approve' | 'deny',
    @Query('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      if (!requesterId || !workspaceId) {
        throw new NotFoundException('Missing required parameters');
      }
      const note = await this.notesService.getNoteById(noteId);
      if (!note) throw new NotFoundException('Note not found');

      await this.notesService.respondPermissionChangeRequest(
        noteId,
        workspaceId || note.workspace_id,
        requesterId,
        action,
        note.created_by,
      );

      const resultStatus = action === 'approve' ? 'approved' : 'denied';
      return res.redirect(`${frontendUrl}/workspaces/${note.workspace_id}/notes/${noteId}?permission_request_status=${resultStatus}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Internal Server Error';
      return res.redirect(`${frontendUrl}/workspaces?permission_request_status=error&message=${encodeURIComponent(errorMessage)}`);
    }
  }

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
      const resultStatus = action === 'approve' ? 'approved' : 'denied';
      const redirectUrl = `${frontendUrl}/workspaces/${workspace_id}/notes/${note_id}?access_request_status=${resultStatus}`;
      return res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('[NotesPublicController] Error handling email response:', error);
      const errorMessage = error?.message || 'Internal Server Error';
      const fallbackUrl = `${frontendUrl}/workspaces?access_request_status=error&message=${encodeURIComponent(errorMessage)}`;
      return res.redirect(fallbackUrl);
    }
  }

}
