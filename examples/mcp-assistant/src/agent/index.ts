/**
 * 规则工具助手
 * 
 * 通过固定关键字选择 MCP 工具，不调用模型，不实现 ReAct 循环
 */

import { MCPClientManager } from "../mcp/client.js";

interface ToolCall {
  tool: string;
  args: object;
  result: string;
}

export class RuleBasedAssistant {
  private clientManager: MCPClientManager;
  private memory: ToolCall[] = [];

  constructor() {
    this.clientManager = new MCPClientManager();
  }

  /**
   * 初始化工具助手
   */
  async initialize(): Promise<void> {
    await this.clientManager.connectWeatherServer();
    await this.clientManager.connectGitHubServer();
    console.log("🤖 工具助手初始化完成\n");
  }

  /**
   * 执行用户查询
   */
  async execute(query: string): Promise<string> {
    console.log(`📝 用户查询: ${query}\n`);

    // 固定规则路由
    const intent = this.parseIntent(query);
    console.log(`🔍 识别意图: ${intent.type}\n`);

    // 根据意图执行
    const results: string[] = [];

    if (intent.type === "weather" && intent.city) {
      const result = await this.clientManager.callWeatherTool("get_weather", {
        city: intent.city,
      });
      results.push(result);
      this.memory.push({ tool: "get_weather", args: { city: intent.city }, result });
    }

    if (intent.type === "github" && intent.query) {
      const result = await this.clientManager.callGitHubTool("search_repos", {
        query: intent.query,
      });
      results.push(result);
      this.memory.push({ tool: "search_repos", args: { query: intent.query }, result });
    }

    if (intent.type === "combined") {
      // 组合查询
      if (intent.city) {
        const weatherResult = await this.clientManager.callWeatherTool("get_weather", {
          city: intent.city,
        });
        results.push(weatherResult);
      }
      if (intent.query) {
        const githubResult = await this.clientManager.callGitHubTool("search_repos", {
          query: intent.query,
        });
        results.push(githubResult);
      }
    }

    // 生成回复
    return this.generateResponse(query, results);
  }

  /**
   * 固定关键字匹配
   */
  private parseIntent(query: string): Intent {
    const lower = query.toLowerCase();
    
    // 提取城市
    const cityMatch = lower.match(/(北京|上海|广州|深圳|杭州)/);
    const city = cityMatch ? cityMatch[1] : null;

    // 提取 GitHub 查询词
    const githubKeywords = ["github", "仓库", "repo", "react", "vue", "angular"];
    const hasGithub = githubKeywords.some((k) => lower.includes(k));
    
    // 提取查询词
    let queryTerm = null;
    if (hasGithub) {
      const terms = ["react", "vue", "angular", "ai", "mcp"];
      queryTerm = terms.find((t) => lower.includes(t)) || "awesome";
    }

    // 判断意图类型
    if (city && queryTerm) {
      return { type: "combined", city, query: queryTerm };
    }
    if (city) {
      return { type: "weather", city };
    }
    if (queryTerm) {
      return { type: "github", query: queryTerm };
    }

    return { type: "unknown" };
  }

  /**
   * 生成回复
   */
  private generateResponse(_query: string, results: string[]): string {
    if (results.length === 0) {
      return "抱歉，我不太理解您的请求。您可以问：\n- 北京天气怎么样？\n- 搜索 React 相关的 GitHub 仓库\n- 帮我查一下上海的天气，再搜索一下 Vue 的仓库";
    }

    return results.join("\n\n");
  }

  /**
   * 关闭工具助手
   */
  async shutdown(): Promise<void> {
    await this.clientManager.disconnect();
    console.log("\n👋 工具助手已关闭");
  }
}

interface Intent {
  type: "weather" | "github" | "combined" | "unknown";
  city?: string;
  query?: string;
}
