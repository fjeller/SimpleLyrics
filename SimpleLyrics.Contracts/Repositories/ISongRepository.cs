using SimpleLyrics.Contracts.DataObjects;
using SimpleLyrics.Contracts.Models;
using SimpleLyrics.Contracts.Results;
using System;
using System.Collections.Generic;
using System.Text;

namespace SimpleLyrics.Contracts.Repositories;

/// ==============================================================================================================================
/// <summary>
/// Defines the contract for song data access operations.
/// </summary>
/// ==============================================================================================================================
public interface ISongRepository
{
	/// ==============================================================================================================================
	/// <summary>
	/// Retrieves all songs from the repository, optionally filtered by search criteria.
	/// </summary>
	/// <param name="filter">
	/// An optional search filter to apply to song title, interpreter, category, or text. Pass <see langword="null"/> to
	/// retrieve all songs.
	/// </param>
	/// <returns>A collection of song data objects matching the filter criteria.</returns>
	/// ==============================================================================================================================
	Task<IEnumerable<SongData>> GetSongsAsync( string? filter );

	/// ==============================================================================================================================
	/// <summary>
	/// Retrieves a specific song by its identifier.
	/// </summary>
	/// <param name="songId">The unique identifier of the song to retrieve.</param>
	/// <returns>The song data object if found; otherwise, <see langword="null"/>.</returns>
	/// ==============================================================================================================================
	Task<SongData?> GetSongAsync( int songId );

	/// ==============================================================================================================================
	/// <summary>
	/// Stores a song in the repository, inserting a new song or updating an existing one.
	/// </summary>
	/// <param name="data">The song data to store. Pass <see langword="null"/> to validate the data.</param>
	/// <returns>A <see cref="SongResult"/> indicating the outcome of the operation.</returns>
	/// ==============================================================================================================================
	Task<SongResult> StoreSongAsync( SongData? data );

	/// ==============================================================================================================================
	/// <summary>
	/// Deletes a song from the repository by its identifier.
	/// </summary>
	/// <param name="songId">The unique identifier of the song to delete.</param>
	/// <returns>A <see cref="SongResult"/> indicating the outcome of the operation.</returns>
	/// ==============================================================================================================================
	Task<SongResult> DeleteSongAsync( int songId );

	/// ==============================================================================================================================
	/// <summary>
	/// Retrieves all distinct categories currently assigned to songs in the repository.
	/// </summary>
	/// <returns>A collection of distinct category names sorted alphabetically.</returns>
	/// ==============================================================================================================================
	Task<IEnumerable<string>> GetCategoriesAsync();
}
