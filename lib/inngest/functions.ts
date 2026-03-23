import {inngest} from "@/lib/inngest/client";
import {NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendWelcomeEmail, sendNewsSummaryEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/User.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

// --- NEW IMPORTS FOR EARNINGS SUMMARY ---
import YahooFinance from 'yahoo-finance2';
import { connectToDatabase } from "@/DATABASE/mongoose";
import EarningsSummary from "@/DATABASE/models/EarningsSummary";


export const sendSignUpEmail = inngest.createFunction(
    {id: 'sign-up-email'},
    {event: 'app/user.created'},
    async ({event, step}) =>{
        const userProfile = `
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `
        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)
        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-3-flash-preview' }),
            body:{
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {text: prompt}
                        ]
                    }
                ]
            }
        })

        await step.run('send-welcome-email', async () =>{
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) || 'Thank you for joining our platform!';

            const {data: {email, name}} = event;
            return await sendWelcomeEmail({email,name,intro:introText});
        })
        return{
            success: true,
            meesage: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    {id: 'daily-news-summary'},
    [{event: 'app/send.daily.news'}, { cron: '0 12 * * *' }], // current setting= at minute 0 of hour 12 every day -> runs daily at 12:00 UTC
    async ({step}) =>{
        const users = await step.run('get-users', getAllUsersForNewsEmail);
        if(!users || users.length ===0) return {success: false, message: 'No users found'};

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: User; articles: MarketNewsArticle[] }> = [];
            for (const user of users as User[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }
                    perUser.push({ user, articles });
                } catch (e) {
                    console.error('daily-news: error preparing user news', user.email, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        const userNewsSummaries: { user: User; newsContent: string | null}[] = [];
        for (const {user,articles} of results){
            try{
                const prompt =  NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}',JSON.stringify(articles,null,2));
                const response = await step.ai.infer(`summarize-news-${user.email}`,{
                    model: step.ai.models.gemini({ model: 'gemini-3-flash-preview' }),
                    body:{
                        contents: [{role: 'user', parts: [{text: prompt}]}]
                    }
                });
                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || 'No news available';

                userNewsSummaries.push({user, newsContent});
            }catch (e){
                console.error('daily-news: error preparing user news', user.email, e);
                userNewsSummaries.push({user, newsContent: null});
            }
        }

        await step.run('send-news-emails', async () =>{
            await Promise.all(
                userNewsSummaries.map(async ({user, newsContent}) =>{
                    if(!newsContent) return false;

                    return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent });
                })
            )
        })
        return{
            success: true,
            message: 'Daily News summaries sent successfully'
        }
    }
)

// --- NEW FUNCTION: GENERATE AI EARNINGS SUMMARY ---
export const generateEarningsSummary = inngest.createFunction(
    { id: "generate-earnings-summary" },
    { event: "stock.earnings.requested" },
    async ({ event, step }) => {
        const { symbol } = event.data;

        // 1. Fetch REAL news headlines specifically about earnings
        const newsContext = await step.run('fetch-yahoo-news', async () => {
            const yahooFinance = new YahooFinance();
            // Appending ' earnings' forces Yahoo to grab financial reports
            const searchRes = await yahooFinance.search(`${symbol} earnings`, { newsCount: 10 });
            // Grab the actual article titles to feed to Gemini
            return searchRes.news.map((n: any) => n.title).join(" | ");
        });

        // 2. Call Gemini with a strict Time-Bound prompt
        const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g., "March 2026"

        const prompt = `
            Today's date is ${currentDate}. You are an expert financial analyst. 
            Your task is to identify and summarize the ABSOLUTE LATEST quarterly earnings report for the stock ticker ${symbol} that was released prior to ${currentDate}.
            
            Recent news headlines to help you identify the latest quarter: 
            ${newsContext}
            
            Respond strictly in JSON format with the following keys:
            - "earningsDate": The actual quarter and year of this specific report (e.g., "Q4 2025" or "Q1 2026"). Do not hallucinate future dates.
            - "summaryText": A solid 2-paragraph summary of revenue, EPS, and forward guidance.
            - "highlights": An array of 3 bullet-point strings highlighting key metrics.
            - "sentiment": A single word: "Bullish", "Bearish", or "Neutral".
            
            Do not include markdown blocks like \`\`\`json. Return raw JSON only.
        `;

        const response = await step.ai.infer(`ask-gemini-earnings-${symbol}`, {
            model: step.ai.models.gemini({ model: 'gemini-3-flash-preview' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ]
            }
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const responseText = (part && 'text' in part ? part.text : null) || '{}';

        // Clean markdown formatting just in case Gemini disobeys the instruction
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiSummary = JSON.parse(cleanJson || '{}');

        // 3. Save to MongoDB
        await step.run("save-earnings-to-db", async () => {
            await connectToDatabase();
            await EarningsSummary.findOneAndUpdate(
                { symbol },
                {
                    symbol,
                    earningsDate: aiSummary.earningsDate || "Recent Quarter",
                    summaryText: aiSummary.summaryText || "Summary unavailable.",
                    highlights: aiSummary.highlights || [],
                    sentiment: aiSummary.sentiment || "Neutral",
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        });

        return { success: true, symbol };
    }
);