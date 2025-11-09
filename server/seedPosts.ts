import 'dotenv/config';
import { db } from "./db";
import { posts, polls, pollOptions, comments } from "@shared/schema";

async function seedPosts() {
  try {
    console.log("Creating genuine posts and polls...");
    
    // Clear existing posts and polls (in correct order to avoid foreign key constraints)
    await db.delete(pollOptions);
    await db.delete(polls);
    await db.delete(comments);
    await db.delete(posts);
    console.log("✅ Cleared existing posts and polls");
    
    // Get bowl IDs
    const bowls = await db.query.bowls.findMany();
    const bowlMap = bowls.reduce((acc, bowl) => {
      acc[bowl.name] = bowl.id;
      return acc;
    }, {} as { [key: string]: number });

    // Get organization IDs
    const organizations = await db.query.organizations.findMany();
    const orgMap = organizations.reduce((acc, org) => {
      acc[org.name] = org.id;
      return acc;
    }, {} as { [key: string]: number });

    // 6 different user accounts
    const users = [
      "suhrad_admin",
      "alex_crypto",
      "sarah_defi",
      "mike_trader", 
      "lisa_nft",
      "dave_developer",
      "emma_investor"
    ];

    // Posts data - 17 posts across different bowls and organizations
    const postsData = [
      // Salary posts
      {
        title: "Uniswap Salary Discussion - Senior Solidity Dev",
        content: "Just got an offer from Uniswap for Senior Solidity Developer role. Base salary $180k + UNI tokens (vesting over 4 years). Anyone else working there? How's the culture and work-life balance? The tech stack looks solid but I'm curious about the team dynamics.",
        authorId: "alex_crypto",
        bowlId: bowlMap["Salary"],
        organizationId: orgMap["Uniswap"],
        type: "discussion"
      },
      {
        title: "OpenSea Compensation Package Review",
        content: "Accepted an offer at OpenSea as Product Manager. $160k base + equity. The interview process was intense but fair. Team seems really passionate about NFTs and the future of digital ownership. Anyone have experience with their remote work culture?",
        authorId: "sarah_defi",
        bowlId: bowlMap["Salary"],
        organizationId: orgMap["OpenSea"],
        type: "discussion"
      },
      {
        title: "Aave vs Compound - Which pays better for devs?",
        content: "Got offers from both Aave and Compound for similar roles. Aave offering $175k + AAVE tokens, Compound offering $165k + COMP. Both have great teams and interesting tech. Anyone worked at either? How do they compare in terms of compensation and growth opportunities?",
        authorId: "mike_trader",
        bowlId: bowlMap["Salary"],
        organizationId: null,
        type: "discussion"
      },

      // General posts
      {
        title: "dYdX Trading Volume Analysis - Bullish or Bearish?",
        content: "Looking at dYdX's recent trading volume data. They've been consistently hitting $1B+ daily volume, but I'm seeing some concerning patterns in their user retention. The platform is solid but competition from centralized exchanges is heating up. What's your take on their long-term prospects?",
        authorId: "lisa_nft",
        bowlId: bowlMap["General"],
        organizationId: orgMap["dYdX"],
        type: "discussion"
      },
      {
        title: "DeFi Summer 2.0 - Are we ready?",
        content: "With the recent market recovery, I'm seeing signs of another DeFi summer. Protocols like Aave and Compound are seeing increased TVL, and new projects are launching daily. But this time feels different - more institutional interest, better infrastructure. What protocols are you most bullish on?",
        authorId: "dave_developer",
        bowlId: bowlMap["General"],
        organizationId: null,
        type: "discussion"
      },
      {
        title: "NFT Market Cooling - Impact on OpenSea",
        content: "The NFT market has definitely cooled off from its peak. OpenSea's trading volume is down significantly, and I'm seeing fewer new collections launching. But this might actually be healthy for the ecosystem. Quality over quantity, right? How do you think this affects OpenSea's business model?",
        authorId: "emma_investor",
        bowlId: bowlMap["General"],
        organizationId: orgMap["OpenSea"],
        type: "discussion"
      },

      // Jobs posts
      {
        title: "Uniswap hiring process - What to expect?",
        content: "Applied for a frontend role at Uniswap. Got through the initial screening and have a technical interview coming up. Anyone been through their process? What kind of questions should I expect? They mentioned React/TypeScript and some DeFi knowledge would be helpful.",
        authorId: "alex_crypto",
        bowlId: bowlMap["Jobs"],
        organizationId: orgMap["Uniswap"],
        type: "discussion"
      },
      {
        title: "Remote work at DeFi protocols - Pros and cons",
        content: "Currently working remotely for a DeFi protocol and it's been a mixed experience. Great flexibility but sometimes hard to stay connected with the team across time zones. How do other remote DeFi teams handle collaboration and communication?",
        authorId: "sarah_defi",
        bowlId: bowlMap["Jobs"],
        organizationId: null,
        type: "discussion"
      },

      // Trading posts
      {
        title: "Been trading on dYdX for about 6 months now. The decentralized aspect is great, but the UI/UX could be better. Still, the fees are lower than most CEXs and I like having full control of my funds. Anyone else prefer DEXs for trading?",
        content: "Been trading on dYdX for about 6 months now. The decentralized aspect is great, but the UI/UX could be better. Still, the fees are lower than most CEXs and I like having full control of my funds. Anyone else prefer DEXs for trading?",
        authorId: "mike_trader",
        bowlId: bowlMap["Trading"],
        organizationId: orgMap["dYdX"],
        type: "discussion"
      },
      {
        title: "Aave's wrapped Bitcoin market analysis",
        content: "With more DeFi protocols accepting Bitcoin as collateral, I'm seeing interesting opportunities. Aave's wrapped Bitcoin market has been growing steadily. Do you think this will become a major trend? The yield isn't amazing but it's a way to put BTC to work.",
        authorId: "dave_developer",
        bowlId: bowlMap["Bitcoin"],
        organizationId: orgMap["Aave"],
        type: "discussion"
      },

      // Ethereum posts
      {
        title: "Ethereum L2 adoption - Impact on Uniswap",
        content: "Uniswap's deployment on multiple L2s has been a game changer for gas fees. Trading on Arbitrum or Optimism is so much cheaper. But I'm curious about liquidity fragmentation. Are you guys using L2 Uniswap or sticking to mainnet?",
        authorId: "emma_investor",
        bowlId: bowlMap["Ethereum"],
        organizationId: orgMap["Uniswap"],
        type: "discussion"
      },

      // DeFi posts
      {
        title: "Aave V3 features - Game changer or overhyped?",
        content: "Aave V3 introduced some interesting features like cross-chain lending and improved capital efficiency. But I'm not sure if the average user will benefit much. The new UI is cleaner though. What features are you most excited about?",
        authorId: "alex_crypto",
        bowlId: bowlMap["DeFi"],
        organizationId: orgMap["Aave"],
        type: "discussion"
      },
      {
        title: "Compound governance - Community participation",
        content: "Compound's governance system is one of the most active in DeFi. I've been participating in some proposals and it's fascinating to see how decisions are made. But voter turnout could be better. How do we encourage more community participation?",
        authorId: "sarah_defi",
        bowlId: bowlMap["DeFi"],
        organizationId: orgMap["Compound"],
        type: "discussion"
      },

      // NFTs posts
      {
        title: "OpenSea royalties debate - Artists vs collectors",
        content: "The whole royalties debate is heating up. OpenSea is trying to enforce royalties but other marketplaces are bypassing them. As an artist, this is concerning. But as a collector, I understand the appeal of lower fees. Where do you stand on this?",
        authorId: "lisa_nft",
        bowlId: bowlMap["NFTs"],
        organizationId: orgMap["OpenSea"],
        type: "discussion"
      },

      // Gaming posts
      {
        title: "NFT gaming - OpenSea's role in the ecosystem",
        content: "NFT gaming is exploding and OpenSea is becoming the go-to marketplace for gaming NFTs. But I'm seeing some games launch their own marketplaces. Do you think OpenSea will maintain dominance or will we see more fragmentation?",
        authorId: "mike_trader",
        bowlId: bowlMap["Gaming"],
        organizationId: orgMap["OpenSea"],
        type: "discussion"
      },

      // News posts
      {
        title: "Uniswap Foundation launch - What it means",
        content: "Uniswap just announced their foundation with $74M in funding. This is huge for governance and development. They're focusing on developer tools and ecosystem growth. What projects do you think will benefit most from this?",
        authorId: "dave_developer",
        bowlId: bowlMap["News"],
        organizationId: orgMap["Uniswap"],
        type: "discussion"
      },
      // Outpost Trading posts
      {
        title: "Outpost Trading Platform - Advanced Features Review",
        content: "Just got access to Outpost's advanced trading features. The portfolio management tools are incredible - real-time P&L tracking, risk analytics, and automated rebalancing. The leverage options go up to 100x but with strict risk controls. Anyone else using Outpost for serious trading?",
        authorId: "suhrad_admin",
        bowlId: bowlMap["Outpost Trading"],
        organizationId: orgMap["Outpost"],
        type: "discussion"
      },
      {
        title: "Outpost Community Governance - Trading Strategy Voting",
        content: "New governance proposal on Outpost: Should we increase the maximum leverage from 100x to 150x for verified traders? This would give more flexibility but also increases risk. As the platform admin, I want community input before implementing changes. What's your take?",
        authorId: "suhrad_admin",
        bowlId: bowlMap["Outpost Trading"],
        organizationId: orgMap["Outpost"],
        type: "discussion"
      },
      {
        title: "Portfolio Performance on Outpost - Q4 Results",
        content: "Sharing my Q4 trading results using Outpost's advanced analytics. The platform's risk management tools helped me maintain a 23% return while keeping drawdowns under 5%. The community governance features are also great - we voted on new trading pairs and got them added within a week. This is the future of trading!",
        authorId: "suhrad_admin",
        bowlId: bowlMap["Outpost Trading"],
        organizationId: orgMap["Outpost"],
        type: "discussion"
      },
      {
        title: "Outpost vs Traditional CEXs - My Experience",
        content: "After 3 months of using Outpost alongside traditional exchanges, here's my comparison: Outpost offers better risk management, community governance, and transparency. The trading fees are competitive, and the leverage options are more flexible. However, liquidity can be lower for some pairs. Overall, Outpost is my primary platform now.",
        authorId: "mike_trader",
        bowlId: bowlMap["Outpost Trading"],
        organizationId: orgMap["Outpost"],
        type: "discussion"
      },
      // Stark posts
      {
        title: "StarkNet vs Ethereum L2s - Performance Comparison",
        content: "Been testing StarkNet for the past few weeks and the performance is incredible. TPS is consistently 1000+ and gas fees are fractions of a cent. The Cairo programming language has a learning curve but the developer experience is solid. How does it compare to other L2s you've used?",
        authorId: "alex_crypto",
        bowlId: bowlMap["Ethereum"],
        organizationId: orgMap["Stark"],
        type: "discussion"
      },
      {
        title: "Cairo Programming Language - Learning Resources",
        content: "Starting to learn Cairo for StarkNet development. The syntax is different from Solidity but the concepts are similar. Anyone have good learning resources or tutorials they'd recommend? The official docs are comprehensive but I'd love some practical examples.",
        authorId: "dave_developer",
        bowlId: bowlMap["Developers"],
        organizationId: orgMap["Stark"],
        type: "discussion"
      },
      {
        title: "StarkWare's Business Model - Sustainable?",
        content: "StarkWare's business model of charging fees for STARK proofs is interesting. They're essentially monetizing the scaling solution that Ethereum needs. But with competition from other ZK rollups, will this model be sustainable long-term? What's your take on their approach?",
        authorId: "emma_investor",
        bowlId: bowlMap["General"],
        organizationId: orgMap["Stark"],
        type: "discussion"
      },
      {
        title: "StarkNet DeFi Ecosystem - What's Next?",
        content: "The DeFi ecosystem on StarkNet is growing rapidly. We've got DEXs, lending protocols, and yield farming. But what's the next big thing? I'm seeing some interesting NFT projects and gaming protocols. What sectors do you think will explode on StarkNet?",
        authorId: "sarah_defi",
        bowlId: bowlMap["DeFi"],
        organizationId: orgMap["Stark"],
        type: "discussion"
      },
      {
        title: "STARKs vs SNARKs - Technical Deep Dive",
        content: "For the developers here: STARKs vs SNARKs. STARKs are quantum-resistant and don't require trusted setup, but they're larger and slower to verify. SNARKs are more efficient but have the trusted setup issue. For StarkNet's use case, STARKs make sense. What's your experience with both?",
        authorId: "alex_crypto",
        bowlId: bowlMap["Developers"],
        organizationId: orgMap["Stark"],
        type: "discussion"
      }
    ];

    // Insert posts
    for (const post of postsData) {
      await db.insert(posts).values({
        title: post.title,
        content: post.content,
        authorId: post.authorId,
        bowlId: post.bowlId,
        organizationId: post.organizationId,
        type: post.type,
        upvotes: Math.floor(Math.random() * 50) + 5,
        downvotes: Math.floor(Math.random() * 10),
        commentCount: Math.floor(Math.random() * 20),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      });
    }

    console.log(`✅ Created ${postsData.length} posts`);

    // Polls data - 4 polls
    const pollsData = [
      {
        title: "Which DeFi protocol has the best developer experience?",
        content: "As a developer working in DeFi, I'm curious about which protocols offer the best developer experience. This includes documentation, SDK quality, testing tools, and community support.",
        authorId: "dave_developer",
        bowlId: bowlMap["DeFi"],
        organizationId: null,
        options: [
          "Uniswap - Great SDK and documentation",
          "Aave - Comprehensive API and tools", 
          "Compound - Simple and well-documented",
          "dYdX - Advanced trading features"
        ]
      },
      {
        title: "What's your preferred NFT marketplace?",
        content: "With so many NFT marketplaces available, which one do you prefer for buying and selling? Consider factors like fees, user experience, security, and community.",
        authorId: "lisa_nft",
        bowlId: bowlMap["NFTs"],
        organizationId: null,
        options: [
          "OpenSea - Largest marketplace, most liquidity",
          "Blur - Lower fees, better for traders",
          "LooksRare - Community-focused",
          "Magic Eden - Solana ecosystem"
        ]
      },
      {
        title: "Which crypto company would you most want to work for?",
        content: "If you had the opportunity to work at any of these major crypto companies, which would you choose? Consider salary, culture, technology, and growth opportunities.",
        authorId: "emma_investor",
        bowlId: bowlMap["Jobs"],
        organizationId: null,
        options: [
          "Uniswap - Leading DEX, innovative tech",
          "OpenSea - NFT pioneer, creative space",
          "Aave - DeFi leader, strong community",
          "dYdX - Trading focus, high performance"
        ]
      },
      {
        title: "What's the biggest challenge facing DeFi adoption?",
        content: "Despite DeFi's growth, mainstream adoption still faces challenges. What do you think is the biggest barrier preventing more people from using DeFi protocols?",
        authorId: "alex_crypto",
        bowlId: bowlMap["General"],
        organizationId: null,
        options: [
          "User experience - Too complex for beginners",
          "Security concerns - Smart contract risks",
          "Regulatory uncertainty - Legal framework unclear",
          "Scalability issues - High gas fees and congestion"
        ]
      }
    ];

    // Insert polls
    for (const poll of pollsData) {
      // First create the post
      const [insertedPost] = await db.insert(posts).values({
        title: poll.title,
        content: poll.content,
        authorId: poll.authorId,
        bowlId: poll.bowlId,
        organizationId: poll.organizationId,
        type: "poll",
        upvotes: Math.floor(Math.random() * 30) + 10,
        downvotes: Math.floor(Math.random() * 5),
        commentCount: Math.floor(Math.random() * 15),
        createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000), // Random date within last 20 days
      }).returning();

      // Then create the poll
      const [insertedPoll] = await db.insert(polls).values({
        title: poll.title,
        description: poll.content,
        authorId: poll.authorId,
        bowlId: poll.bowlId,
        organizationId: poll.organizationId,
        postId: insertedPost.id,
        upvotes: Math.floor(Math.random() * 30) + 10,
        downvotes: Math.floor(Math.random() * 5),
        createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
      }).returning();

      // Insert poll options
      for (const option of poll.options) {
        await db.insert(pollOptions).values({
          pollId: insertedPoll.id,
          text: option,
          voteCount: Math.floor(Math.random() * 100) + 5,
        });
      }
    }

    console.log(`✅ Created ${pollsData.length} polls with options`);
    console.log("📊 Content distribution:");
    console.log(`   - Posts: ${postsData.length}`);
    console.log(`   - Polls: ${pollsData.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Organizations: ${organizations.length}`);
    console.log(`   - Bowls: ${bowls.length}`);
    
  } catch (error) {
    console.error("❌ Error creating posts and polls:", error);
  } finally {
    process.exit(0);
  }
}

seedPosts(); 