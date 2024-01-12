import {Link, useFetcher, useLoaderData, useParams} from "@remix-run/react";
import {json, LoaderFunctionArgs} from "@remix-run/node";
import {prisma} from "~/db.server";
import {Comment, Post, Prisma} from "@prisma/client";
import {DateTime} from 'luxon'
import {useEffect} from "react";

export async function loader({params}: LoaderFunctionArgs) {
  const sort = params.sort === 'new' ? 'created_at' : 'score'
  // still safe from injection because sort has only 2 possible values
  const posts = await prisma.$queryRaw<(Post & { numComments: number })[]>`
    SELECT c."numComments" , p.* FROM "Post" p CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS "numComments"
    FROM "Comment" c
    WHERE c.parent_id = 't3_' || p.id
    ) c ORDER BY p.${Prisma.raw(sort)} DESC LIMIT 20
  `

  return json(posts);
}


export default function HomePage() {
  const posts = useLoaderData<typeof loader>();
  return (
    <div>
      <p className='text-3xl bg-blue-400 p-4'>
        Not Reddit
      </p>
      <div className='flex p-4 pb-0'>
        <Link to={`/`} className={'mr-4'}>
          top
        </Link>
        <Link to={`/new`}>
          new
        </Link>
      </div>
      <ul className={'p-4 flex flex-col'}>
        {posts.map((post, i) => (
          <div className={'flex flex-row items-center my-3'}>
            <p className={'pr-3 font-bold w-8 text-center'}>
              {i + 1}
            </p>
            <p className={'pr-3 w-20 text-center'}>
              {post.score}
            </p>
            <div className={'mr-3 flex flex-grow flex-col max-w-20 items-center'}>
              {post.thumbnail === 'self' ?
                <p>
                  text post
                </p>
                :
                <img src={post.thumbnail}/>
              }
            </div>

            <div>
              <Link to={post.url}>
                {post.title}
              </Link>
              <div className={'flex'}>
                <p className={'mr-1'}>
                  Submitted {DateTime.fromISO(post.created_at).toRelative()} ago by {post.author} to
                </p>
                <Link to={'/r/' + post.subreddit}>
                  r/{post.subreddit}
                </Link>
              </div>
              <Link to={`/post/${post.id}`}>
                {post.numComments} comment{post.numComments > 1 && 's'}
              </Link>
            </div>
          </div>
        ))}
      </ul>
    </div>

  );
}