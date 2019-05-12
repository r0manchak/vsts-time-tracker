import { Request, Response } from "express";
import { AzurePr } from "./azure/pr";

/**
 * GET /prs
 * All Pull Requests.
 */
export let getPrs = (req: Request, res: Response) => {
  const pr = new AzurePr(10, req.query.profileId);
  pr.getTaskTimesPerDay()
    .then(taskTimes => {
      // res.contentType('text/json');
      res.render("azure/day-tasks", {
        title: "Time Sheet",
        days: taskTimes.days,
        tasks: taskTimes.tasks,
        profiles: taskTimes.profiles,
        selectedProfile: taskTimes.profileId
      });
    })
    .catch(err => {
      res.render("azure/json", {
        title: "Err PRs",
        data: err
      });
    });
};
