import { Request, Response } from "express";

/**
 * GET /
 * Home page.
 */
export let index = (req: Request, res: Response) => {
  res.redirect('/azure');
/*  res.render("home", {
    title: "Home"
  });*/
};
