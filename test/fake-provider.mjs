// Synthetic Docker-only provider. All network requests are intercepted.
globalThis.fetch=async(url,options)=>{
  if(!url.startsWith('https://backend.composio.dev/api/v3.1/tool_router/session'))throw Error('Unexpected provider URL');
  if(url.endsWith('/session'))return new Response(JSON.stringify({session_id:'trs_synthetic'}));
  if(url.includes('/toolkits'))return new Response(JSON.stringify({items:[],total_items:0,next_cursor:null}));
  if(url.endsWith('/search'))return new Response(JSON.stringify({results:[],tool_schemas:{}}));
  if(url.endsWith('/execute_meta'))return new Response(JSON.stringify({data:{schemas:[]}}));
  throw Error('Unexpected synthetic provider operation');
};
