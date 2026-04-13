import { PlateService } from '../../../services/plateService';
import { hasSupabaseConfig, supabase } from '../../../services/supabaseClient';
import { normalizeTag } from '../../../shared/utils/taxonomy';

const snapDataUrlToBlob = (dataUrl: string): Blob => {
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.codePointAt(i) ?? 0;
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
};

const uploadSnapImage = async (imageData: string): Promise<string> => {
  if (!hasSupabaseConfig || !supabase) {
    return imageData;
  }

  try {
    const filePath = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const imageBlob = snapDataUrlToBlob(imageData);

    const { error: uploadError } = await supabase.storage
      .from('snaps')
      .upload(filePath, imageBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.warn('SNAP image upload failed, using local image:', uploadError.message);
      return imageData;
    }

    const { data } = supabase.storage.from('snaps').getPublicUrl(filePath);
    return data.publicUrl || imageData;
  } catch (error) {
    console.warn('SNAP image upload failed, using local image:', error);
    return imageData;
  }
};

export const persistSnapData = async ({
  snapId,
  imageData,
  restaurant,
  cuisine,
  rating,
  description,
  locationName,
  address,
  tags,
  location,
}: {
  snapId: string;
  imageData: string;
  restaurant: string;
  cuisine: string;
  rating: number;
  description: string;
  locationName?: string;
  address: string;
  tags: string[];
  location?: { lat: number; lng: number } | null;
}) => {
  const imageUrl = await uploadSnapImage(imageData);

  const metadata = {
    title: restaurant || `Culinary Snap ${new Date().toLocaleDateString()}`,
    name: restaurant || `Culinary Snap ${new Date().toLocaleDateString()}`,
    cat: normalizeTag(cuisine) || 'Studio Post',
    image: imageUrl,
    image_url: imageUrl,
    photos: [imageUrl],
    rating,
    description,
    notes: description,
    location_name: locationName || restaurant,
    address: address || '',
    latitude: location?.lat ?? null,
    longitude: location?.lng ?? null,
    tags: Array.isArray(tags) ? tags.map(normalizeTag) : [],
    source: 'snap_feature',
  };

  if (hasSupabaseConfig && supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      let sourcePostId: string | null = null;

      if (userId) {
        const contentParts = [`${metadata.title} - ${metadata.cat}`];
        if (description) contentParts.push(description);
        if (rating > 0) contentParts.push(`Rating: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`);

        const { data: createdPost, error: postInsertError } = await supabase.from('posts').insert({
          user_id: userId,
          content: contentParts.join('\n'),
          image_url: imageUrl,
          latitude: location?.lat ?? null,
          longitude: location?.lng ?? null,
          created_at: new Date().toISOString(),
        }).select('id').single();

        if (postInsertError) {
          console.warn('SNAP posts persistence skipped:', postInsertError.message);
        } else {
          sourcePostId = typeof createdPost?.id === 'string' ? createdPost.id : null;
        }

        const { error: datasetInsertError } = await supabase.from('fuzo_locations').insert({
          user_id: userId,
          source_snap_id: snapId,
          source_post_id: sourcePostId,
          location_name: metadata.location_name,
          restaurant_name: metadata.name,
          cuisine: metadata.cat,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          address: metadata.address,
          photos: metadata.photos,
          notes: metadata.notes,
          tags: metadata.tags,
        });

        if (datasetInsertError) {
          console.warn('SNAP FUZO dataset persistence failed:', datasetInsertError.message);
        }
      }
    } catch (error) {
      console.warn('SNAP posts persistence skipped:', error);
    }

    const plateResult = await PlateService.saveToPlate({
      itemId: snapId,
      itemType: 'photo',
      metadata,
    });

    if (!plateResult.success) {
      console.warn('SNAP plate persistence failed:', plateResult.error);
    }
  }

  return {
    id: `post-${snapId}`,
    itemType: 'photo',
    itemId: snapId,
    name: metadata.title,
    cat: metadata.cat,
    img: imageUrl,
    address: metadata.address,
    lat: metadata.latitude ?? undefined,
    lng: metadata.longitude ?? undefined,
    photos: metadata.photos,
    metadata,
  };
};
