using Fjeller.SimpleMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SimpleLyrics.Contracts.DataObjects;
using SimpleLyrics.Contracts.Repositories;
using SimpleLyrics.Contracts.Results;
using SimpleLyrics.Data.SqlServer.DataAccess.Context;
using SimpleLyrics.Data.SqlServer.DataAccess.Entities;
using System.Diagnostics.CodeAnalysis;

namespace SimpleLyrics.Data.SqlServer.Repositories;

/// ==============================================================================================================================
/// <summary>
/// Implements song data access operations using SQL Server.
/// </summary>
/// ==============================================================================================================================
public class SongRepository : ISongRepository
{
	#region Fields

	private readonly IDbContextFactory<SongsDataContext> _dataContextFactory;
	private readonly ISimpleMapper _mapper;
	private readonly ILogger<SongRepository> _logger;

	#endregion

	#region Properties

	/// =============================================================================================================================
	/// <summary>
	/// Gets or sets the current database context instance.
	/// </summary>
	/// <value>The database context, or <see langword="null"/> if not initialized.</value>
	/// =============================================================================================================================
	private SongsDataContext? DataContext { get; set; }

	#endregion

	#region Private Methods

	/// =============================================================================================================================
	/// <summary>
	/// Creates and initializes a new database context instance.
	/// </summary>
	/// <returns>A task that represents the asynchronous operation.</returns>
	/// =============================================================================================================================
	[MemberNotNull( "DataContext" )]
	private async Task CreateDataContextAsync()
	{
		DataContext = await _dataContextFactory.CreateDbContextAsync();
	}

	/// =============================================================================================================================
	/// <summary>
	/// Inserts a new song into the database.
	/// </summary>
	/// <param name="data">The song data to insert.</param>
	/// <returns>A <see cref="SongResult"/> indicating the outcome of the insert operation.</returns>
	/// =============================================================================================================================
	private async Task<SongResult> InternalInsertSongAsync(SongData data)
	{
		try
		{
			Song? newSong = _mapper.Map<Song>( data );
			if (newSong is null )
			{
				return SongResult.SongCouldNotBeAdded;
			}

			await DataContext!.Songs.AddAsync( newSong );
			await DataContext.SaveChangesAsync();

			return SongResult.SongAdded;
		}
		catch ( Exception ex )
		{
			_logger.LogError( ex, "{Classname}.{Methodname}: Error while Inserting a song in the database", nameof( SongRepository ), nameof( InternalInsertSongAsync ) );

			return SongResult.SongCouldNotBeAdded;
		}
	}

	/// =============================================================================================================================
	/// <summary>
	/// Updates an existing song in the database.
	/// </summary>
	/// <param name="data">The song data to update.</param>
	/// <returns>A <see cref="SongResult"/> indicating the outcome of the update operation.</returns>
	/// =============================================================================================================================
	private async Task<SongResult> InternalUpdateSongAsync(SongData data)
	{
		try
		{
			Song? currentSong = DataContext!.Songs.FirstOrDefault( s => s.Id == data.Id );
			if (currentSong == null )
			{
				return SongResult.SongCouldNotBeUpdated;
			}

			_mapper.Map( data, currentSong );

			await DataContext.SaveChangesAsync();

			return SongResult.SongUpdated;
		}
		catch ( Exception ex )
		{
			_logger.LogError( ex, "{Classname}.{Methodname}: Error while updating a song in the database", nameof( SongRepository ), nameof( InternalUpdateSongAsync ) );

			return SongResult.SongCouldNotBeUpdated;
		}
	}

	#endregion

	#region Public Methods

	/// =============================================================================================================================
	/// <inheritdoc/>
	/// =============================================================================================================================
	public async Task<IEnumerable<SongData>> GetSongsAsync( string? filter )
	{
		await CreateDataContextAsync();

		try
		{
			List<Song> songs = filter is null
				? await DataContext.Songs.ToListAsync()
				: await DataContext.Songs.Where( s =>
				( s.Category != null && s.Category.Contains( filter ) ) ||
				( s.Interpreter != null && s.Interpreter.Contains( filter ) ) ||
				s.Title.Contains( filter ) ||
				( s.Text != null && s.Text.Contains( filter ) ) )
				.ToListAsync();

			var orderedSongs = songs.OrderBy( s => s.Title );

			List<SongData> result = _mapper.Map<SongData>( orderedSongs ).ToList();

			return result;
		}
		catch ( Exception ex )
		{
			_logger.LogError( ex, "{Classname}.{Methodname}: Error while loading songs from database", nameof( SongRepository ), nameof( GetSongsAsync ) );

			return [];
		}
	}

	/// =============================================================================================================================
	/// <inheritdoc/>
	/// =============================================================================================================================
	public async Task<SongData?> GetSongAsync( int songId )
	{
		await CreateDataContextAsync();

		try
		{
			Song? currentSong = await DataContext.Songs.FirstOrDefaultAsync( s => s.Id == songId );
			if ( currentSong is null )
			{
				return null;
			}
			SongData? result = _mapper.Map<SongData>( currentSong );

			return result;
		}
		catch ( Exception ex )
		{
			_logger.LogError( ex, "{Classname}.{Methodname}: Error while loading song with id {SongId} from database", nameof( SongRepository ), nameof( GetSongAsync ), songId );

			return null;
		}
	}

	/// =============================================================================================================================
	/// <inheritdoc/>
	/// =============================================================================================================================
	public async Task<SongResult> StoreSongAsync( SongData? data )
	{
		if (data is null )
		{
			return SongResult.SongDataIsInvalid;
		}

		SongResult result = data.Id <= 0
			? await InternalInsertSongAsync( data )
			: await InternalUpdateSongAsync( data );

		return result;
	}

	/// =============================================================================================================================
	/// <inheritdoc/>
	/// =============================================================================================================================
	public async Task<SongResult> DeleteSongAsync( int songId )
	{
		await CreateDataContextAsync();

		try
		{
			int deletedCount = await DataContext.Songs
				.Where( s => s.Id == songId )
				.ExecuteDeleteAsync();

			return deletedCount == 0 ? SongResult.SongCouldNotBeDeleted : SongResult.SongDeleted;
		}
		catch ( Exception ex )
		{
			_logger.LogError( ex, "{Classname}.{Methodname}: Error while deleting song with id {SongId} from database", nameof( SongRepository ), nameof( DeleteSongAsync ), songId );

			return SongResult.SongCouldNotBeDeleted;
		}
	}

	#endregion

	#region Constructors

	/// =============================================================================================================================
	/// <summary>
	/// Initializes a new instance of the <see cref="SongRepository"/> class.
	/// </summary>
	/// <param name="dataContextFactory">The factory for creating database context instances.</param>
	/// <param name="mapper">The object mapper for converting between entities and data objects.</param>
	/// <param name="logger">The logger for recording repository operations and errors.</param>
	/// =============================================================================================================================
	public SongRepository( IDbContextFactory<SongsDataContext> dataContextFactory, ISimpleMapper mapper, ILogger<SongRepository> logger )
	{
		_dataContextFactory = dataContextFactory;
		_mapper = mapper;
		_logger = logger;
	}

	#endregion
}
