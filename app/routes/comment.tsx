import {json, LoaderFunctionArgs} from "@remix-run/node";
import {prisma} from "~/db.server";
import {Comment} from "@prisma/client";

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const commentId = url.searchParams.get('commentId')
  const comments = await prisma.$queryRaw<(Comment & {numReplies: number})[]>`
    WITH cte_comment AS (SELECT * FROM "Comment" WHERE parent_id = 't1_' || ${commentId})
    SELECT c.*, c1."numReplies" FROM cte_comment c
    CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS "numReplies"
    FROM "Comment" c1
    WHERE c1.parent_id = 't1_' || c.id
    ) c1
  `
  return json(comments);
}