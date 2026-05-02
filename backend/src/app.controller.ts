import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
	/** Railway / load balancer — does not hit the database */
	@Get("health")
	health() {
		return { status: "ok" };
	}
}
