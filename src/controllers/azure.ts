import { Request, Response } from "express";
import { AzurePr } from "./azure/pr";

/**
 * GET /prs
 * All Pull Requests.
 */
export let getPrs = (req: Request, res: Response) => {
  const prCount = req.query.count || 10;

  const pr = new AzurePr(prCount, req.query.profileId);
  pr.getTaskTimesPerDay()
    .then(taskTimes => {
      res.render("azure/day-tasks", {
        title: "Time Sheet",
        days: taskTimes.days,
        tasks: taskTimes.tasks,
        profiles: taskTimes.profiles,
        selectedProfile: taskTimes.profileId,
        prCount: prCount
      });
    })
    .catch(err => {
      res.contentType('text/json');
      res.render("azure/json", {
        title: "Err PRs",
        data: err
      });
    });
};
