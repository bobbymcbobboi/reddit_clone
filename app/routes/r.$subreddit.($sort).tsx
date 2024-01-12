import {Link, useFetcher, useLoaderData, useParams} from "@remix-run/react";
import {json, LoaderFunctionArgs} from "@remix-run/node";
import {Comment, Post, Prisma} from "@prisma/client";
import {DateTime} from 'luxon'
import {useEffect, useState} from "react";
import {prisma} from "~/db.server";

export async function loader({params, request}: LoaderFunctionArgs) {
  const url = new URL(request.url)
  let score = parseInt(url.searchParams.get('score') ?? '')
  let time = url.searchParams.get('time')
  let extraCondition = Prisma.sql``
  if (score) {
    extraCondition = Prisma.sql`AND p.score < ${score}`
  }
  if (time) {
    extraCondition = Prisma.sql`AND p.created_at < CAST('2023-01-07T20:45:42.000Z' AS timestamp)`
  }
  const sort = params.sort === 'new' ? 'created_at' : 'score'
  // still safe from injection because sort has only 2 possible values
  const posts = await prisma.$queryRaw<(Post & { numComments: number })[]>`
    SELECT c."numComments" , p.* FROM "Post" p CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS "numComments"
    FROM "Comment" c
    WHERE c.parent_id = 't3_' || p.id
    ) c WHERE p.subreddit = ${params.subreddit} ${extraCondition} ORDER BY p.${Prisma.raw(sort)} DESC LIMIT 20
  `
  // console.log(posts)

  return json(posts);
}


export default function Subreddit() {
  const _posts = useLoaderData<typeof loader>();
  const params = useParams()
  const fetcher = useFetcher<typeof loader>()
  const [posts, setPosts] = useState(_posts)
  useEffect(() => {
    if (!fetcher.data || fetcher.state === 'loading') {
      return;
    }
    const newItems = fetcher.data
    setPosts((prevState) => {
      return [...prevState, ...newItems]
    })
  }, [fetcher.data]);
  return (
    <div>
      <p className='text-3xl bg-blue-400 p-4'>
        {params.subreddit}
      </p>
      <div className='flex p-4 pb-0'>
        <Link reloadDocument to={`/r/${params.subreddit}`} className={'mr-4'}>
          top
        </Link>
        <Link reloadDocument to={`/r/${params.subreddit}/new`}>
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
              <div>
                <p>
                  Submitted {DateTime.fromISO(post.created_at).toRelative()} ago by {post.author}
                </p>
              </div>
              <Link to={`/post/${post.id}`}>
                {post.numComments} comment{post.numComments > 1 && 's'}
              </Link>
            </div>
          </div>
        ))}
      </ul>
      <button className={'ml-3 mb-4 text-blue-600'} onClick={() => {
        if (params.sort === 'new') {
          fetcher.load(`/r/${params.subreddit}/new?index&time=${posts[posts.length - 1].created_at}`)
        } else {
          fetcher.load(`/r/${params.subreddit}?index&score=${posts[posts.length - 1].score}`)
        }
      }}>
        load more
      </button>
    </div>

  );
}