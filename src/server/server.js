const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors({
    origin: '*',
    methods: [
        "GET", "POST"
    ],
    allowedHeaders: '*'
}));
app.use(express.json());
async function get_data(urls_a, ip, key, lang) {
    const data_key = key;
    const data_st_id = ip;
    const responses = urls_a.map(appid => {
        try {
            const ach_url = `http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid[0]}&key=${data_key}&steamid=${data_st_id}&l=${lang}`;
            const perc_url = `http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appid[0]}&format=json`;
            const ico_url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${appid[0]}&key=${data_key}&l=${lang}`;
            const urls = [ach_url, perc_url, ico_url];

            // Add CORS headers to the request
            const headers = new Headers();
            headers.append('Access-Control-Allow-Origin', 'http://localhost:4500');
            headers.append('timeout', '1000');

            return Promise.all([
                ...urls.map(url => fetch(url, {headers}).then(response => response.json())), {
                    'appid': appid[0]
                }, {
                    'last_launch_time': appid[1]
                }, {
                    'playtime': appid[2]
                }
            ]);
        } catch (err) {
            console.error(err);
        }
    });
    let ret_data = {};
    try {
        const results = await Promise.all(responses);
        const filtered = results.filter((data) => {
            return data[0].playerstats.gameName && data[1].achievementpercentages.achievements && data[0].playerstats.achievements && data[2].game;
        });
        ret_data = filtered.map((data, index) => {
            try {
                const arr1 = data[1].achievementpercentages.achievements;
                const arr2 = data[0].playerstats.achievements;
                const arr3 = data[2].game.availableGameStats.achievements;
                const mergedArray = arr3.reduce((acc, curr) => {
                    const matchingObjInArr2 = arr2.find(obj => obj.apiname === curr.name);
                    delete matchingObjInArr2.apiname;
                    let matchingObjInArr3 = arr1.find(obj => obj.name === curr.name);
                    if (!matchingObjInArr3) {
                        matchingObjInArr3 = {
                            name: curr.name,
                            percent: 0.1
                        }
                    }
                    if (matchingObjInArr2 && matchingObjInArr3) {
                        acc.push({
                            ...curr,
                            ...matchingObjInArr2,
                            ...matchingObjInArr3
                        });
                    }

                    return acc;
                }, []);
                return {appid: data[3].appid, last_launch_time: data[4].last_launch_time, playtime: data[5].playtime, gameName: data[0].playerstats.gameName, Achievement: mergedArray};
            } catch (error) {
                console.log(error);

            };
        });
    } catch (error) {
        console.error(error);
        throw new Error('An error occurred while retrieving data from Steam Web API');
    } finally {
        return ret_data;
    }
};

async function getFriendList(apiKey, steamId) {
    try {
        const response = await fetch(`http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${steamId}`);

        const friendIds = response.data.friendslist.friends.map(friend => friend.steamid);
        return friendIds;
    } catch (error) {
        console.error('Ошибка при получении списка друзей:', error);
        return [];
    }
}

async function getPersonData(key,ids){
    try {
        const response = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${ids}`)
        const friendDate = response.data.friendslist.friends.map(friend => friend.steamid);
    }
    catch (error){
        console.error('Ошибка при получении данных друга:', error);
        return [];
    }
}

app.post('/data', async(req, res) => {
    const array = req.body.appid;
    const {steam_ip, key, lang} = req.query;
    console.log(lang);
    const data = await get_data(JSON.parse(array), steam_ip, key, lang);
    res.send(data);
});

app.listen(4500, () => {
    console.log('listening on 4500');
});
