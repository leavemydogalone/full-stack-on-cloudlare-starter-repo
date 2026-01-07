import { DurableObject } from 'cloudflare:workers';

export class EvaluationScheduler extends DurableObject {
	count: number = 0;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.count = (await ctx.storage.get('count')) || this.count;
		});
	}

	async increment() {
		this.count++;
		await this.ctx.storage.put('count', this.count);
	}

	// this in memory count will always be up to date, don't need to access storage
	async getCount() {
		return this.count;
	}
}
