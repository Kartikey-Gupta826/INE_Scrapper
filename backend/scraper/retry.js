function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, options = {}) {
    const retries = options.retries ?? 3;
    const baseDelay = options.baseDelay ?? 1000;
    const onAttempt = options.onAttempt;

    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        const startTime = Date.now();

        try {
            const result = await fn(attempt);

            const durationMs = Date.now() - startTime;

            if (onAttempt) {
                await onAttempt({
                    attempt,
                    outcome: "success",
                    durationMs,
                    errorMessage: null,
                    result
                });
            }

            return {
                success: true,
                result,
                attempts: attempt
            };

        } catch (error) {
            lastError = error;

            const durationMs = Date.now() - startTime;
            const isLastAttempt = attempt === retries;

            // Record the scraping failure.
            // A logging failure must not be mistaken for a scraping failure.
            try {
                if (onAttempt) {
                    await onAttempt({
                        attempt,
                        outcome: isLastAttempt ? "failed" : "retried",
                        durationMs,
                        errorMessage: error.message,
                        result: null
                    });
                }
            } catch (logError) {
                console.error("Failed to record attempt:", logError);
                throw logError;
            }

            console.error(
                `Attempt ${attempt}/${retries} failed: ${error.message}`
            );

            if (!isLastAttempt) {
                const delay = baseDelay * 2 ** (attempt - 1);

                console.log(`Retrying in ${delay}ms...`);

                await sleep(delay);
            }
        }
    }

    return {
        success: false,
        error: lastError,
        attempts: retries
    };
}

module.exports = {
    withRetry,
    sleep
};