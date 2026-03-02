using SimpleLyrics.Contracts.Models;
using SimpleLyrics.Contracts.Results;
using System;
using System.Collections.Generic;
using System.Text;

namespace SimpleLyrics.Contracts.Services;

/// ==============================================================================================================================
/// <summary>
/// Defines the contract for song business logic operations.
/// </summary>
/// ==============================================================================================================================
public interface ISongService
{
	/// ==============================================================================================================================
	/// <summary>
	/// Retrieves all songs from the service, optionally filtered by search criteria.
	/// </summary>
	/// <param name="filter">
	/// An optional search filter to apply to song title, interpreter, category, or text. Pass <see langword="null"/> to
	/// retrieve all songs.
	/// </param>
	/// <returns>A list of song models matching the filter criteria.</returns>
	/// ==============================================================================================================================
	Task<List<SongModel>> GetSongsAsync( string? filter );

	/// ==============================================================================================================================
	/// <summary>
	/// Retrieves a specific song by its identifier.
	/// </summary>
	/// <param name="songId">The unique identifier of the song to retrieve.</param>
	/// <returns>The song model if found; otherwise, <see langword="null"/>.</returns>
	/// ==============================================================================================================================
	Task<SongModel?> GetSong( int songId );

	/// ==============================================================================================================================
	/// <summary>
	/// Stores a song, inserting a new song or updating an existing one.
	/// </summary>
	/// <param name="model">The song model to store.</param>
	/// <returns>A <see cref="SongResult"/> indicating the outcome of the operation.</returns>
	/// ==============================================================================================================================
	Task<SongResult> StoreSong( SongModel model );

	/// ==============================================================================================================================
	/// <summary>
	/// Deletes a song by its identifier.
	/// </summary>
	/// <param name="songId">The unique identifier of the song to delete.</param>
	/// <returns>A <see cref="SongResult"/> indicating the outcome of the operation.</returns>
	/// ==============================================================================================================================
	Task<SongResult> DeleteSong( int songId );

	/// ==============================================================================================================================
	/// <summary>
	/// Retrieves all distinct categories currently assigned to songs.
	/// </summary>
	/// <returns>A collection of distinct category names sorted alphabetically.</returns>
	/// ==============================================================================================================================
	Task<IEnumerable<string>> GetCategoriesAsync();
}
