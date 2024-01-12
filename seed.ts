import {Prisma, PrismaClient} from '@prisma/client';
import {readFile} from 'fs/promises'
import {existsSync} from 'fs'
import CommentCreateManyInput = Prisma.CommentCreateManyInput;
import CommentCreateManyArgs = Prisma.CommentCreateManyArgs;
import PostCreateInput = Prisma.PostCreateInput;
import {catchClause} from "@babel/types";
const prisma = new PrismaClient({
  log: [
    // {
    //     emit: "stdout",
    //     level: "query",
    // },
    // {
    //   emit: 'stdout',
    //   level: 'error',
    // },
    // {
    //   emit: 'stdout',
    //   level: 'info',
    // },
    // {
    //   emit: 'stdout',
    //   level: 'warn',
    // },
  ],
});

type Comment = {
  author: string
  author_fullname: string
  body: string
  created_utc: string
  edited: boolean
  gilded: string
  id: string
  is_submitter: boolean
  link_id: string
  locked: boolean
  name: string
  parent_id: string
  permalink: string
  score: string
  subreddit: string
  subreddit_id: string
}

type Post = {
  author: string
  author_fullname: string
  created_utc: string
  id: string
  name: string
  over_18: boolean
  permalink: string
  score: string
  selftext: string
  subreddit: string
  subreddit_id: string
  thumbnail: string
  title: string
  url: string
}
async function main() {
  console.log(`Start seeding ...`);
  for (let i = 0; i < 136; i+= 1) {
    const fileName = `/Users/ryanlin/src/gigabrain_takehome/sample_data/comments/${i.toString().padStart(12, '0')}.json`
    if (!existsSync(fileName)) {
      continue
    }
    console.log(i)
    const commentData = (((await readFile(fileName, 'utf-8') as string).split('\n').filter(s => s !== '').map(s => {
      return JSON.parse(s)
    }) as Comment[]).map(c => {
      return {
        ...c,
        created_at: new Date(c.created_utc).toISOString(),
        gilded: parseInt(c.gilded),
        score: parseInt(c.score),
        created_utc: undefined,
        author_fullname: c.author_fullname ?? '[deleted]'
      }
    }))
    console.log('creating')
    await prisma.comment.createMany({
      data: commentData
    })
  }

  for (let i = 0; i < 33; i+= 1) {
    const fileName = `/Users/ryanlin/src/gigabrain_takehome/sample_data/posts/${i.toString().padStart(12, '0')}.json`
    if (!existsSync(fileName)) {
      continue
    }
    console.log(i)
    const postData = (((await readFile(fileName, 'utf-8') as string).split('\n').filter(s => s !== '').map(s => {
      return JSON.parse(s)
    }) as Post[]).map(c => {

      return {
        ...c,
        created_at: new Date(c.created_utc).toISOString(),
        score: parseInt(c.score),
        created_utc: undefined,
      }
    }))
    try {
      await prisma.post.createMany({
        data: postData
      })
    } catch (e) {
      console.log(e)
    }


    // console.log((postData).length)
    // for (let i = 0; i < postData.length; i+= 10)
    // try {
    //   await prisma.post.createMany({
    //     data: postData.slice(i, i + 10)
    //   })
    // } catch {
    //   console.log(postData.slice(i, i+10))
    //   return
    // }

  }





  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });