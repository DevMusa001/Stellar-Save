import { Router } from 'express';
import { AppError } from '../lib/errors';
import { GroupsService } from '../services/group/groups.service';
import { InMemoryGroupsRepository } from '../services/group/groups.repository';

/**
 * Groups controller: request/response mapping only. No business rules and no
 * data access here, so the same behaviour is testable through GroupsService
 * without spinning up HTTP.
 */
export function createGroupsRouter(service: GroupsService = new GroupsService(new InMemoryGroupsRepository())): Router {
  const router = Router();

  router.get('/groups', async (_req, res) => {
    const groups = await service.listGroups();
    res.json(groups);
  });

  router.get('/groups/:id', async (req, res) => {
    try {
      const group = await service.getGroupById(req.params.id);
      res.json(group);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
