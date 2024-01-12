import {Link, useFetcher, useLoaderData, useParams} from "@remix-run/react";
import {json, LoaderFunctionArgs} from "@remix-run/node";
import {prisma} from "~/db.server";
import {DateTime} from 'luxon'
import {Response} from "@remix-run/web-fetch";
import {Comment} from "@prisma/client";
import {useEffect, useState} from "react";
import {loader as commentLoader} from "~/routes/comment";

export async function loader({params}: LoaderFunctionArgs) {

  const post = await prisma.post.findUnique({
    where: {
      id: params.postId
    }
  })

  if (!post) {
    throw new Response('No post found', {
      status: 404
    })
  }
  // first CTE (common table expression) queries for all top level comments of post, second CTE queries for all replies
  // to those comments. Then, use a lateral join to get number of replies to those replies so user can load more
  // prisma doesn't support CTEs, so have to use a raw query
  const comments = await prisma.$queryRaw<(Comment & { numReplies: number })[]>`
    WITH cte_comment AS (SELECT * FROM "Comment" WHERE parent_id = 't3_' || ${post.id}), 
    cte_child_comment AS (SELECT c.* FROM "Comment" as c JOIN cte_comment ON c.parent_id = 't1_' || cte_comment.id)
    SELECT c.*, c1."numReplies" FROM cte_child_comment c
    CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS "numReplies"
    FROM "Comment" c1
    WHERE c1.parent_id = 't1_' || c.id
    ) c1 UNION SELECT *, 0 FROM cte_comment ORDER BY score DESC
  `
  return json({
    post: post,
    comments: comments
  })
}


export default function Post() {
  const {post, comments: _comments} = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof commentLoader>()
  const [comments, setComments] = useState(_comments)
  const [clickedCommentId, setClickedCommentId] = useState('')
  useEffect(() => {
    if (!fetcher.data || fetcher.state === 'loading') {
      return;
    }
    const newItems = fetcher.data
    if (comments.find(c => c.id === newItems[0].id)) {
      return
    }
    setClickedCommentId('')
    setComments((prevState) => {
      return [...prevState, ...newItems]
    })
  }, [fetcher.data]);
  // new type because we want each comment to have all its replies in one array
  type CommentWithReplies = (typeof comments[number] & {
    replies: CommentWithReplies[]
  })
  const commentsWithReplies: CommentWithReplies[] = comments.map(c => {
    return {
      ...c,
      replies: []
    }
  })
  const params = useParams()
  const topLevelComments: CommentWithReplies[] = commentsWithReplies.filter(c => c.parent_id === 't3_' + post.id)
  // building up the tree from the flat array of comments
  // map to optimize speed
  const commentMap = new Map<string, CommentWithReplies>()
  commentsWithReplies.forEach(m => commentMap.set('t1_' + m.id, m))
  for (const c of commentsWithReplies) {
    const parentComment = commentMap.get(c.parent_id)
    // if a parent comment is found, push reply to its replies array
    if (parentComment) {
      parentComment.replies.push(c)
    }
  }

  const CommentThread = ({comment}: { comment: CommentWithReplies }) => {
    return (
      <div className='border-2 p-1 my-2 px-3'>
        <div className='flex-row flex'>
          <p className='font-bold mr-2'>{comment.author} </p>
          <p>
            {comment.score} point{comment.score !== 1 && 's'}
          </p>
        </div>
        <br/>
        <p>
          {comment.body}
        </p>
        {comment.replies.length > 0 ? comment.replies.map(r => (
            <div className='ml-4' key={r.id}>
              <CommentThread comment={r}/>
            </div>

          )) :
          (comment.numReplies > 0) &&
            <button className={'mt-2'} onClick={() => {
              setClickedCommentId(comment.id)
              fetcher.load(`/comment?index&commentId=${comment.id}`)
            }}>
              {
                clickedCommentId === comment.id ?
                  <p>
                    loading
                  </p> :
                  <div className={'flex-row flex'}>
                    <p className={'text-blue-600 mr-2'}>
                      load more comments
                    </p>
                    <p className={'text-gray-400'}>
                      ({comment.numReplies} {comment.numReplies > 1 ? 'replies' : 'reply'})
                    </p>
                  </div>
              }
            </button>
        }
      </div>
    )
  }

  // console.log(topLevelComments)

  return (
    <div>
      <div className='text-3xl bg-blue-400 p-4'>
        <Link to={'/r/' + post.subreddit} className={'visited:text-black no-underline'}>
          {post.subreddit}
        </Link>
      </div>
      <div className={'flex flex-row items-center my-3 pl-3'}>
        <p className={'mr-3 pr-3 w-12 text-center'}>
          {post.score}
        </p>
        <img src={post.thumbnail} className={'mr-3'}/>
        <div>
          <p className={'font-bold'}>
            {post.title}
          </p>
          <div>
            <p>
              Submitted {DateTime.fromISO(post.created_at).toRelative()} ago by {post.author_fullname}
            </p>
          </div>
          <p>
            {post.selftext}
          </p>
          <Link to={post.url} >
            {post.url}
          </Link>
        </div>
      </div>
      <div className={'pl-3'}>
        {topLevelComments.map(tlc => (
          <CommentThread comment={tlc} key={tlc.id}/>
        ))}
      </div>
    </div>

  );
}