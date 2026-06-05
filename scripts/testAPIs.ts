import { YouTubeService } from '../src/services/youtubeService';

async function testAPIs() {
  console.log('\n🧪 Testing YouTube API...');
  try {
    const videoResult = await YouTubeService.searchVideos('cooking pasta', 5);
    
    if (videoResult.success && videoResult.data?.items) {
      console.log('✅ YouTube: SUCCESS');
      console.log(`   Retrieved ${videoResult.data.items.length} videos`);
      console.log(`   Sample: ${videoResult.data.items[0]?.snippet?.title || 'N/A'}`);
    } else {
      console.log('❌ YouTube: FAILED');
      console.log(`   Error: ${videoResult.error}`);
    }
  } catch (error) {
    console.log('❌ YouTube: ERROR');
    console.error('   ', error);
  }
}

testAPIs().then(() => {
  console.log('\n✅ API tests complete');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test script failed:', err);
  process.exit(1);
});
