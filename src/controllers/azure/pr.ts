import * as azure from "./common";
import * as gitApi from "azure-devops-node-api/GitApi";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { GitPullRequestSearchCriteria, PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces";
import { WorkItem } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";

export class AzurePr {
  constructor(
    public prNumber = 10,
    public profileId?: string
  ) {}

  public static async getPrApi(): Promise<gitApi.IGitApi> {
    return await azure.connection.getGitApi();
  }

  public static async getWorkItemsApi() {
    return await azure.connection.getWorkItemTrackingApi();
  }

  public async getProfiles() {
    const gitApi = await AzurePr.getPrApi();
    const prs = await gitApi.getPullRequestsByProject(
      process.env.AZURE_PROJECT,
      <GitPullRequestSearchCriteria>{
        status: PullRequestStatus.All
      },
      undefined, undefined, 15
    );

    const profiles = prs.reduce((res, pr) => {
      const profile = pr.createdBy;
      if (res[profile.id]) {
        return res;
      }

      res[profile.id] = profile;
      return res;
    }, {});

    return profiles;
  }

  public async getPrs(): Promise<GitInterfaces.GitPullRequest[]> {
    const gitApi = await AzurePr.getPrApi();
    if (!this.profileId) {
      this.profileId = await azure.getMyId();
    }
    return await gitApi.getPullRequestsByProject(
      process.env.AZURE_PROJECT,
      <GitPullRequestSearchCriteria>{
        creatorId: this.profileId,
        status: PullRequestStatus.All
      },
      undefined,
      undefined,
      this.prNumber
    );
  }

  public async getItemHistory(item: WorkItem) {
    const wiApi = await AzurePr.getWorkItemsApi();
    const history = await wiApi.getRevisions(item.id);

    const maxRemainingWork = history.reduce((max, rec) => {
      if (max < rec.fields['Microsoft.VSTS.Scheduling.RemainingWork']) {
        return rec.fields['Microsoft.VSTS.Scheduling.RemainingWork'];
      }

      return max;
    }, 0.5);

    // todo: improve the calc algo

    return maxRemainingWork;
  }

  public async getWorkItems() {
    const prs = await this.getPrs();
    const gitApi = await AzurePr.getPrApi();
    const wiApi = await AzurePr.getWorkItemsApi();

    const refs = prs.map(async (pr, i) => {
        const itemRefs = await gitApi.getPullRequestWorkItemRefs(pr.repository.id, pr.pullRequestId);

        const items = itemRefs
          .map((item, ii) => {
            return wiApi.getWorkItem(Number(item.id));
          })
          .map(async pItem => {
            const item = await pItem;
            const fields = item.fields;

            const history = await this.getItemHistory(item);

            // todo: move to model
            return {
              id: item.id,
              type: fields['System.WorkItemType'],
              state: fields['System.State'],
              iterationPath: fields['System.IterationPath'],
              title: fields['System.Title'],
              createdDate: fields['System.CreatedDate'],
              closedDate: fields['Microsoft.VSTS.Common.ClosedDate'],
              tags: fields['System.Tags'],
              history,

              // todo: get parent story
              parentStory: {}
            };
          });

        return {
          pr: {
            id: pr.pullRequestId,
            title: pr.title,
            creationDate: pr.creationDate
          },
          items: await Promise.all(items)
        };
      }
    );

    return Promise.all(refs);
  }

  public async getTaskTimesPerDay() {
    const items = await this.getWorkItems();

    // groupBy days
    const days = items.reverse().reduce((res, item) => {
      const day = item.pr.creationDate.toLocaleDateString();
      if (!res[day]) {
        res[day] = [];
      }
      res[day].push(item);

      return res;
    }, {});

    const tasks = items
      .reduce((res, item) => res.concat(item.items), [])
      .reduce((res, item) => res.some(r => r.id === item.id) ? res : res.concat(item), []) // remove dubs
      .reverse();

    const profiles = await this.getProfiles();

    return {
      days,
      tasks,
      profiles,
      profileId: this.profileId
    };
  }
}


