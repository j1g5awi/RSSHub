import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/user/blog/:id',
    categories: ['anime'],
    example: '/bgm/user/blog/sai',
    parameters: { id: '用户 id, 在用户页面地址栏查看' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['bgm.tv/user/:id', 'bangumi.tv/user/:id', 'chii.in/user/:id'],
        },
    ],
    name: '用户日志',
    maintainers: ['nczitzk'],
    handler,
};

async function handler(ctx) {
    const currentUrl = `https://bgm.tv/user/${ctx.req.param('id')}/blog`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });
    const $ = load(response.data);
    const list = $('#entry_list div.item')
        .find('h2.title')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a');
            return {
                title: a.text(),
                link: new URL(a.attr('href'), 'https://bgm.tv').href,
                pubDate: timezone(parseDate(item.parent().find('small.time').text()), 0),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const res = await got({ method: 'get', url: item.link });
                const content = load(res.data);

                item.description = content('#entry_content').html();
                return item;
            })
        )
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
