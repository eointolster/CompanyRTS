
import os
import asyncio
import logging
from dotenv import load_dotenv

# Import specific clients - assuming standard installations
# Make sure you have installed these:
# pip install google-generativeai python-dotenv openai anthropic
try:
    import google.generativeai as genai
except ImportError:
    genai = None # Handle import error gracefully
try:
    from openai import AsyncOpenAI, OpenAIError
except ImportError:
    AsyncOpenAI = None # Handle import error gracefully
    OpenAIError = None
try:
    from anthropic import AsyncAnthropic, AnthropicError
except ImportError:
    AsyncAnthropic = None # Handle import error gracefully
    AnthropicError = None

# --- Basic Logging Setup ---
# Configure logging for better traceability of API calls and errors
# Use the existing logger from the calling module or configure one here
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__) # Use the standard Python logger
# --- ---

class LLMService:
    """
    Handles interaction with Google Gemini, OpenAI, and Anthropic models.
    Loads API keys from .env file and provides a unified interface.
    Includes enhanced logging for debugging.
    """
    def __init__(self):
        """
        Loads API keys and configures clients upon instantiation.
        """
        logger.info("Initializing LLMService...")
        load_dotenv() # Load variables from .env file into environment

        # --- Get API Keys ---
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")

        # --- Configure Clients ---
        self.google_client = self._configure_google_client()
        self.openai_client = self._configure_openai_client()
        self.anthropic_client = self._configure_anthropic_client()

        if not any([self.google_client, self.openai_client, self.anthropic_client]):
            logger.error("LLMService initialized, but NO API clients could be configured. Check API keys.")
        else:
            logger.info("LLMService initialized successfully.")

    def _configure_google_client(self):
        """Configures and returns the Google GenAI client."""
        if not self.google_api_key:
            logger.warning("GOOGLE_API_KEY not found in .env file. Google Gemini API will be unavailable.")
            return None
        if not genai:
            logger.error("google.generativeai library not installed. Google Gemini API will be unavailable.")
            return None
        try:
            genai.configure(api_key=self.google_api_key)
            logger.info("Google GenAI client configured.")
            return genai # Return the configured module itself
        except Exception as e:
            logger.error(f"Failed to configure Google GenAI client: {e}")
            return None

    def _configure_openai_client(self):
        """Configures and returns the OpenAI client."""
        if not self.openai_api_key:
            logger.warning("OPENAI_API_KEY not found in .env file. OpenAI API will be unavailable.")
            return None
        if not AsyncOpenAI or not OpenAIError:
            logger.error("openai library not installed or incomplete. OpenAI API will be unavailable.")
            return None
        try:
            client = AsyncOpenAI(api_key=self.openai_api_key)
            logger.info("OpenAI client configured.")
            return client
        except OpenAIError as e:
            logger.error(f"Failed to configure OpenAI client: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred during OpenAI client configuration: {e}")
            return None

    def _configure_anthropic_client(self):
        """Configures and returns the Anthropic client."""
        if not self.anthropic_api_key:
            logger.warning("ANTHROPIC_API_KEY not found in .env file. Anthropic API will be unavailable.")
            return None
        if not AsyncAnthropic or not AnthropicError:
             logger.error("anthropic library not installed or incomplete. Anthropic API will be unavailable.")
             return None
        try:
            client = AsyncAnthropic(api_key=self.anthropic_api_key)
            logger.info("Anthropic client configured.")
            return client
        except AnthropicError as e:
            logger.error(f"Failed to configure Anthropic client: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred during Anthropic client configuration: {e}")
            return None

    # --- START DEBUG --- Enhanced generate method with more detailed logging
    async def generate(self, llm_type: str, prompt: str, model_name: str = None, max_retries: int = 3, initial_delay: int = 1) -> str:
        """
        Enhanced generate method with more detailed logging for debugging.
        """
        # --- Start Debug Logging ---
        logger.info(f"LLM DEBUG: generate called with '{llm_type}' (model: {model_name or 'default'})")
        logger.debug(f"LLM DEBUG: prompt length: {len(prompt)}") # Use debug level for potentially long prompts
        logger.debug(f"LLM DEBUG: prompt preview: {prompt[:100]}...")
        # --- End Debug Logging ---

        attempt = 0
        delay = initial_delay

        # Before entering the retry loop, verify the client exists
        client_exists = False
        client_available_msg = "available"
        if llm_type == 'gemini':
            if self.google_client: client_exists = True
            else: client_available_msg = "not configured or API key/library missing"
        elif llm_type == 'openai':
            if self.openai_client: client_exists = True
            else: client_available_msg = "not configured or API key/library missing"
        elif llm_type == 'anthropic':
            if self.anthropic_client: client_exists = True
            else: client_available_msg = "not configured or API key/library missing"
        else:
            client_available_msg = f"type '{llm_type}' is not supported"

        # --- Start Debug Logging ---
        if client_exists:
             logger.info(f"LLM DEBUG: Client for '{llm_type}' is available.")
        else:
             error_msg = f"LLM DEBUG: Client for '{llm_type}' is {client_available_msg}."
             logger.error(error_msg)
             return f"Error: Client for '{llm_type}' is {client_available_msg}" # Return error early
        # --- End Debug Logging ---

        while attempt < max_retries:
            try:
                # --- Start Debug Logging ---
                logger.info(f"LLM DEBUG: Starting attempt {attempt+1}/{max_retries} for {llm_type}")
                # --- End Debug Logging ---

                if llm_type == 'gemini':
                    # Default model adjusted - check Google's current recommended models
                    model_to_use = model_name if model_name else "gemini-2.5-pro-preview-03-25"
                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: Calling gemini: {model_to_use}")
                    # --- End Debug Logging ---
                    result = await self._call_gemini(prompt, model_to_use)
                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: gemini call completed (attempt {attempt+1}), result length: {len(result)}")
                    # --- End Debug Logging ---
                    return result # Return on first success

                elif llm_type == 'openai':
                    model_to_use = model_name if model_name else "gpt-4.1" # Or your preferred default
                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: Calling openai: {model_to_use}")
                    # --- End Debug Logging ---
                    result = await self._call_openai(prompt, model_to_use)
                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: openai call completed (attempt {attempt+1}), result length: {len(result)}")
                    # --- End Debug Logging ---
                    return result # Return on first success

                elif llm_type == 'anthropic':
                    model_to_use = model_name if model_name else "claude-3-7-sonnet-20250219" # Or sonnet/opus
                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: Calling anthropic: {model_to_use}")
                    # --- End Debug Logging ---
                    result = await self._call_anthropic(prompt, model_to_use)
                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: anthropic call completed (attempt {attempt+1}), result length: {len(result)}")
                    # --- End Debug Logging ---
                    return result # Return on first success

                else: # Should have been caught earlier, but defensively handle
                    error_msg = f"LLM type '{llm_type}' is not supported."
                    logger.error(f"LLM DEBUG: {error_msg}")
                    return f"Error: {error_msg}"

            except Exception as e: # Catch base Exception for broader coverage including API errors
                error_details = str(e)
                 # --- Start Debug Logging ---
                logger.error(f"LLM DEBUG: Exception during attempt {attempt+1}: {error_details}", exc_info=True)
                # --- End Debug Logging ---

                # Basic transient error check (refine based on specific API error codes/types)
                is_transient = False
                if OpenAIError and isinstance(e, OpenAIError): # Example check for OpenAI
                    # Add specific status codes if known (e.g., 429, 500, 503)
                    is_transient = True # Assume OpenAIError might be transient
                elif AnthropicError and isinstance(e, AnthropicError): # Example check for Anthropic
                    is_transient = True
                # Add checks for Gemini specific errors if available
                elif "rate_limit" in error_details.lower() or "server error" in error_details.lower():
                    is_transient = True

                # --- Start Debug Logging ---
                logger.info(f"LLM DEBUG: Error classified as transient: {is_transient}")
                # --- End Debug Logging ---

                if is_transient and attempt < max_retries - 1:
                    attempt += 1
                    # --- Start Debug Logging ---
                    logger.warning(f"LLM DEBUG: Retrying (Attempt {attempt+1}/{max_retries}). Delay: {delay}s")
                    # --- End Debug Logging ---
                    await asyncio.sleep(delay)
                    delay *= 2 # Exponential backoff
                else: # Non-transient error or max retries reached
                    error_msg = f"LLM call failed after {attempt+1} attempts for {llm_type}: {error_details}"
                    # --- Start Debug Logging ---
                    logger.error(f"LLM DEBUG: {error_msg}")
                    # --- End Debug Logging ---
                    return f"Error: {error_msg}" # Return the error message

        # Fallback if loop finishes without returning (shouldn't happen with current logic)
        final_error_msg = f"LLM generation failed for {llm_type} after exhausting retries (unexpected loop exit)."
        # --- Start Debug Logging ---
        logger.error(f"LLM DEBUG: {final_error_msg}")
        # --- End Debug Logging ---
        return f"Error: {final_error_msg}"
    # --- END DEBUG ---


    # --- START DEBUG --- Add detailed logging to the provider-specific methods
    async def _call_gemini(self, prompt: str, model_name: str) -> str:
        """Internal method to call the Google Gemini API with enhanced logging."""
        if not self.google_client: return "Error: Gemini client not configured"
        try:
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: _call_gemini - Using model: {model_name}")
            # --- End Debug Logging ---
            model = self.google_client.GenerativeModel(model_name)
            # --- Start Debug Logging ---
            logger.info("LLM DEBUG: Google model instance created")
            # --- End Debug Logging ---

            loop = asyncio.get_running_loop()
            # --- Start Debug Logging ---
            logger.info("LLM DEBUG: About to call Google API via executor")
            # --- End Debug Logging ---
            # Note: generate_content might be blocking, run in executor for async context
            response = await loop.run_in_executor(None, model.generate_content, prompt)
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: Google API call completed")
            # --- End Debug Logging ---

            # Check for response status and content blocking
            # Accessing parts and checking feedback might differ slightly based on version
            try:
                 # Attempt to access text directly first
                 text_response = response.text
                 # --- Start Debug Logging ---
                 logger.info(f"LLM DEBUG: Successful Gemini response, text length: {len(text_response)}")
                 # --- End Debug Logging ---
                 return text_response

            except ValueError as ve: # Often indicates blocked content or no response text
                 logger.warning(f"LLM DEBUG: Gemini response access error (may indicate blocking): {ve}")
                 if response.prompt_feedback and response.prompt_feedback.block_reason:
                     block_reason = response.prompt_feedback.block_reason
                     # --- Start Debug Logging ---
                     logger.warning(f"LLM DEBUG: Gemini response blocked due to: {block_reason}")
                     # --- End Debug Logging ---
                     return f"Error: Content blocked by API ({block_reason})"
                 else:
                     # --- Start Debug Logging ---
                     logger.warning("LLM DEBUG: Gemini response was empty, missing parts, or blocked without explicit reason.")
                     # --- End Debug Logging ---
                     return "Error: Empty or blocked response from API"
            except Exception as inner_e: # Catch other potential issues accessing response
                 logger.error(f"LLM DEBUG: Error accessing Gemini response content: {inner_e}", exc_info=True)
                 return f"Error: Could not parse Gemini response ({inner_e})"

        except Exception as e:
            # --- Start Debug Logging ---
            logger.error(f"LLM DEBUG: Error during Gemini API call execution ({model_name}): {e}", exc_info=True)
            # --- End Debug Logging ---
            raise # Re-raise for the main generate method's retry logic

    async def _call_openai(self, prompt: str, model_name: str) -> str:
        """Internal method to call the OpenAI API with enhanced logging."""
        if not self.openai_client: return "Error: OpenAI client not configured"
        try:
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: _call_openai - Using model: {model_name}")
            logger.info("LLM DEBUG: About to call OpenAI API chat.completions.create")
            # --- End Debug Logging ---

            response = await self.openai_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: OpenAI API call completed")
            # --- End Debug Logging ---

            # Add checks for valid response structure
            if not response.choices or not response.choices[0].message or response.choices[0].message.content is None:
                 logger.warning(f"LLM DEBUG: Invalid OpenAI response structure: {response}")
                 return "Error: Invalid response structure from OpenAI."

            content = response.choices[0].message.content.strip()
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: Successful OpenAI response, content length: {len(content)}")
            # --- End Debug Logging ---
            return content
        except Exception as e: # Catch OpenAIError specifically if needed for different handling
            # --- Start Debug Logging ---
            logger.error(f"LLM DEBUG: Error during OpenAI API call ({model_name}): {e}", exc_info=True)
            # --- End Debug Logging ---
            raise # Re-raise for retry logic

    async def _call_anthropic(self, prompt: str, model_name: str) -> str:
        """Internal method to call the Anthropic API with enhanced logging."""
        if not self.anthropic_client: return "Error: Anthropic client not configured"
        try:
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: _call_anthropic - Using model: {model_name}")
            logger.info("LLM DEBUG: About to call Anthropic API messages.create")
            # --- End Debug Logging ---

            # Note: Max tokens might need adjustment or be passed as a parameter
            response = await self.anthropic_client.messages.create(
                model=model_name,
                max_tokens=8192, # Adjusted default max_tokens
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            # --- Start Debug Logging ---
            logger.info(f"LLM DEBUG: Anthropic API call completed")
            # --- End Debug Logging ---

            # Check response structure carefully
            if response.content and isinstance(response.content, list) and len(response.content) > 0:
                 # Ensure the first block has text content
                 first_block = response.content[0]
                 if hasattr(first_block, 'text'):
                    content = first_block.text.strip() # Often the primary text is in the first block
                    # You might want to join text from multiple blocks if applicable:
                    # content = "".join([block.text for block in response.content if hasattr(block, 'text')])

                    # --- Start Debug Logging ---
                    logger.info(f"LLM DEBUG: Successful Anthropic response, content length: {len(content)}")
                    # --- End Debug Logging ---
                    return content
                 else:
                     logger.warning(f"LLM DEBUG: First block in Anthropic response missing 'text' attribute: {first_block}")
                     return "Error: Could not parse Anthropic response (missing text)."
            else:
                 # --- Start Debug Logging ---
                 logger.warning(f"LLM DEBUG: Unexpected Anthropic response structure or empty content: {response}")
                 # --- End Debug Logging ---
                 return "Error: Could not parse Anthropic response (empty or wrong format)."
        except Exception as e: # Catch AnthropicError specifically if needed
            # --- Start Debug Logging ---
            logger.error(f"LLM DEBUG: Error during Anthropic API call ({model_name}): {e}", exc_info=True)
            # --- End Debug Logging ---
            raise # Re-raise for retry logic
    # --- END DEBUG ---

# Example usage (if running this file directly for testing)
# if __name__ == '__main__':
#     async def main():
#         logging.basicConfig(level=logging.INFO) # Setup logging for testing
#         service = LLMService()
#         if service.openai_client: # Check if configured
#              prompt = "Explain the concept of asynchronous programming in Python."
#              response = await service.generate('openai', prompt)
#              print("\nOpenAI Response:")
#              print(response)
#         if service.google_client:
#              prompt = "What are the main benefits of using Flask for web development?"
#              response = await service.generate('gemini', prompt)
#              print("\nGemini Response:")
#              print(response)
#         if service.anthropic_client:
#              prompt = "Write a short poem about a rainy day."
#              response = await service.generate('anthropic', prompt)
#              print("\nAnthropic Response:")
#              print(response)
#     asyncio.run(main())